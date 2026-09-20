"""
build_heart.py — Cœur anatomique stylisé pour Atrium (Blender headless → GLB).

Construit de zéro un cœur « illustration médicale stylisée » :
  * masse musculaire (2 ventricules + 2 oreillettes + auricules) en métaballes,
    convertie en maillage, remaillée en voxels, lissée, puis sillons creusés
    (sillon coronaire / auriculo-ventriculaire, sillons interventriculaires) ;
  * gros vaisseaux (aorte + crosse et ses 3 branches, tronc pulmonaire et ses
    2 branches, veines caves, 4 veines pulmonaires) en courbes de Bézier
    biseautées converties en maillage ;
  * artères coronaires (IVA, circonflexe, coronaire droite → IVP, branches
    diagonale et marginale) : tubes fins « plaqués » sur la surface du muscle
    (projection point-le-plus-proche, équivalent d'un Shrinkwrap).

Conventions Blender : Z vers le haut, apex vers −Z, face antérieure vers −Y,
gauche du patient vers +X (donc à droite de l'observateur en vue de face).
L'export utilise export_yup=True : dans le GLB l'apex pointe vers −Y, l'aorte
vers +Y et la face antérieure regarde +Z (vers la caméra three.js par défaut).

Usage :
  blender --background --factory-startup --python tools/blender/build_heart.py -- [options]

Options (après « -- ») :
  --out <fichier.glb>        chemin du GLB (défaut : frontend/public/models/heart.glb)
  --preview-dir <dossier>    dossier des aperçus PNG (défaut : /tmp/atrium)
  --engine <EEVEE|WORKBENCH|CYCLES>  moteur préféré (défaut : EEVEE, repli auto)
  --no-render                ne pas produire les aperçus
  --extra-views              aperçus supplémentaires (côtés) pour inspection

Ne dépend que de bpy / bmesh / mathutils. Ré-exécutable (la scène est vidée).
"""

import math
import os
import sys
import time
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.kdtree import KDTree

# ---------------------------------------------------------------------------
# Paramètres généraux
# ---------------------------------------------------------------------------

RACINE_PROJET = Path(__file__).resolve().parents[2]
GLB_PAR_DEFAUT = RACINE_PROJET / "frontend" / "public" / "models" / "heart.glb"
APERCUS_PAR_DEFAUT = Path("/tmp/atrium")

HAUTEUR_CIBLE = 2.0            # hauteur totale du modèle (unités Blender / mètres GLB)
TAILLE_VOXEL = 0.033           # taille de voxel du remaillage du muscle
BUDGET_TRIANGLES_MUSCLE = 40000  # au-delà, décimation automatique du muscle

# Couleurs (sRGB hexadécimal) et matériaux — les noms sont ceux exportés dans le GLB.
MATERIAUX = {
    "Muscle":    {"couleur": "#8E1D3C", "rugosite": 0.42, "coat": 0.25},
    "Artere":    {"couleur": "#B3304F", "rugosite": 0.38, "coat": 0.20},
    "Veine":     {"couleur": "#5A3B6E", "rugosite": 0.40, "coat": 0.15},
    "Coronaire": {"couleur": "#C9A24A", "rugosite": 0.35, "coat": 0.10},
}
# Convention d'illustration (oxygénation) : le tronc pulmonaire transporte du
# sang désoxygéné → on lui donne la teinte « Veine ». Mettre "Artere" pour
# revenir à une coloration purement structurelle.
MATERIAU_TRONC_PULMONAIRE = "Veine"

# Rayons des vaisseaux
RAYON_AORTE = 0.16
RAYON_BRANCHE_CROSSE = 0.062
RAYON_BRACHIOCEPHALIQUE = RAYON_BRANCHE_CROSSE * 1.15
RAYON_TRONC_PULMONAIRE = 0.13
RAYON_ARTERE_PULMONAIRE = 0.095
RAYON_VEINE_CAVE_SUP = 0.115
RAYON_VEINE_CAVE_INF = 0.125
RAYON_VEINE_PULMONAIRE = 0.06
RAYON_CORONAIRE = 0.025
RAYON_CORONAIRE_BRANCHE = 0.017

# Axe long du cœur : de la base (haut) vers l'apex (bas, en avant, à gauche du patient).
BASE = Vector((-0.05, 0.05, 0.30))
APEX = Vector((0.40, -0.15, -1.00))
AXE = APEX - BASE
AXE_U = AXE.normalized()


# ---------------------------------------------------------------------------
# Utilitaires
# ---------------------------------------------------------------------------

def journal(*args):
    print("[coeur]", *args)
    sys.stdout.flush()


def lire_options():
    """Options passées après « -- » sur la ligne de commande Blender."""
    argv = sys.argv
    args = argv[argv.index("--") + 1:] if "--" in argv else []
    options = {
        "out": GLB_PAR_DEFAUT,
        "preview_dir": APERCUS_PAR_DEFAUT,
        "engine": "EEVEE",
        "render": True,
        "extra_views": False,
    }
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--out":
            options["out"] = Path(args[i + 1]); i += 1
        elif a == "--preview-dir":
            options["preview_dir"] = Path(args[i + 1]); i += 1
        elif a == "--engine":
            options["engine"] = args[i + 1].upper(); i += 1
        elif a == "--no-render":
            options["render"] = False
        elif a == "--extra-views":
            options["extra_views"] = True
        else:
            journal("option inconnue ignorée :", a)
        i += 1
    return options


def hex_vers_lineaire(hexa):
    """'#RRGGBB' (sRGB) → tuple RGBA linéaire attendu par les sockets Blender."""
    hexa = hexa.lstrip("#")
    comp = []
    for k in range(3):
        c = int(hexa[2 * k:2 * k + 2], 16) / 255.0
        comp.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*comp, 1.0)


def vider_scene():
    """Supprime tous les objets et purge les données orphelines (ré-exécutable)."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.metaballs, bpy.data.materials,
                 bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for bloc in list(coll):
            if bloc.users == 0:
                coll.remove(bloc)


def maillage_evalue(obj):
    """Maillage résultant de l'évaluation (modificateurs, métaballes, biseau de courbe…)."""
    bpy.context.view_layer.update()
    dg = bpy.context.evaluated_depsgraph_get()
    return bpy.data.meshes.new_from_object(obj.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)


def appliquer_modificateurs(obj):
    """Remplace les données de l'objet par le maillage évalué, sans opérateur (fiable en headless)."""
    nouveau = maillage_evalue(obj)
    ancien = obj.data
    if len(nouveau.materials) == 0:          # conserver les matériaux déjà assignés
        for mat in ancien.materials:
            nouveau.materials.append(mat)
    obj.data = nouveau
    obj.modifiers.clear()
    if ancien.users == 0:
        bpy.data.meshes.remove(ancien)
    return obj


def nombre_triangles(me):
    return sum(len(p.vertices) - 2 for p in me.polygons)


def fusionner_maillages(nom, maillages, materiau):
    """Fusionne plusieurs maillages (transformations identité) en un objet à un seul matériau."""
    bm = bmesh.new()
    for me in maillages:
        bm.from_mesh(me)
    me_out = bpy.data.meshes.new(nom)
    bm.to_mesh(me_out)
    bm.free()
    me_out.materials.append(materiau)
    for p in me_out.polygons:
        p.material_index = 0
    obj = bpy.data.objects.new(nom, me_out)
    bpy.context.scene.collection.objects.link(obj)
    for me in maillages:
        if me.users == 0:
            bpy.data.meshes.remove(me)
    return obj


def lisser_chemin(points, passes=2):
    """Moyenne glissante [1/4, 1/2, 1/4] sur une liste de Vector (extrémités fixes)."""
    pts = [Vector(p) for p in points]
    for _ in range(passes):
        nouveaux = [pts[0]]
        for i in range(1, len(pts) - 1):
            nouveaux.append(0.25 * pts[i - 1] + 0.5 * pts[i] + 0.25 * pts[i + 1])
        nouveaux.append(pts[-1])
        pts = nouveaux
    return pts


# ---------------------------------------------------------------------------
# Matériaux
# ---------------------------------------------------------------------------

def creer_materiau(nom, couleur_hex, rugosite, coat):
    mat = bpy.data.materials.new(nom)
    if hasattr(mat, "use_nodes"):          # déprécié en 5.x mais encore nécessaire
        mat.use_nodes = True
    arbre = mat.node_tree
    # Recherche par TYPE de nœud, jamais par nom (les noms sont localisés).
    bsdf = next((n for n in arbre.nodes if n.type == "BSDF_PRINCIPLED"), None)
    if bsdf is None:
        bsdf = arbre.nodes.new("ShaderNodeBsdfPrincipled")
        sortie = next((n for n in arbre.nodes if n.type == "OUTPUT_MATERIAL"), None)
        if sortie is None:
            sortie = arbre.nodes.new("ShaderNodeOutputMaterial")
        arbre.links.new(bsdf.outputs["BSDF"], sortie.inputs["Surface"])
    couleur = hex_vers_lineaire(couleur_hex)
    bsdf.inputs["Base Color"].default_value = couleur
    bsdf.inputs["Roughness"].default_value = rugosite
    bsdf.inputs["Metallic"].default_value = 0.0
    for nom_socket in ("Coat Weight", "Clearcoat"):   # 4.x+ / anciennes versions
        if nom_socket in bsdf.inputs:
            bsdf.inputs[nom_socket].default_value = coat
            break
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = 0.15
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.45
    mat.diffuse_color = couleur    # couleur d'affichage (Workbench)
    mat.roughness = rugosite
    return mat


def creer_materiaux():
    return {nom: creer_materiau(nom, p["couleur"], p["rugosite"], p["coat"]) for nom, p in MATERIAUX.items()}


# ---------------------------------------------------------------------------
# Masse musculaire (métaballes)
# ---------------------------------------------------------------------------

def ratio_visible(raideur, seuil):
    """Rapport rayon visible / rayon d'influence d'une métaballe isolée.

    Champ de Blender : f(r) = raideur · (1 − r²/R²)³ ; la surface est à f = seuil.
    """
    return math.sqrt(1.0 - (seuil / raideur) ** (1.0 / 3.0))


def ajouter_element(mb, type_, centre, dims, direction=None, raideur=4.0):
    """Ajoute un élément dont les dimensions VISIBLES sont `dims`.

    dims : rayon (BALL) ou demi-axes (x, y, z) (ELLIPSOID). `direction` oriente
    l'axe local Z de l'ellipsoïde.
    """
    k = ratio_visible(raideur, mb.threshold)
    el = mb.elements.new()
    el.type = type_
    el.co = Vector(centre)
    el.stiffness = raideur
    if type_ == "BALL":
        el.radius = dims / k
    else:
        el.radius = 1.0
        el.size_x, el.size_y, el.size_z = (a / k for a in dims)
    if direction is not None:
        el.rotation = Vector(direction).normalized().to_track_quat("Z", "Y")
    return el


def construire_muscle(materiau):
    """Ventricules, oreillettes, auricules → maillage lisse et remaillé."""
    mb = bpy.data.metaballs.new("Myocarde_meta")
    mb.resolution = 0.07
    mb.render_resolution = 0.07
    mb.threshold = 0.6

    sur_axe = lambda t: BASE + AXE * t  # noqa: E731 — point sur l'axe long (t = 0 base, 1 apex)

    # --- Ventricules : cône oblique effilé vers l'apex (blend doux, raideur 4)
    ajouter_element(mb, "ELLIPSOID", sur_axe(0.32), (0.55, 0.42, 0.72), AXE_U, 4.0)   # corps (VG + septum)
    ajouter_element(mb, "BALL", sur_axe(0.62), 0.40, None, 4.0)                        # tiers moyen
    ajouter_element(mb, "BALL", sur_axe(0.85), 0.27, None, 4.0)                        # tiers apical
    ajouter_element(mb, "BALL", sur_axe(0.98), 0.15, None, 4.0)                        # pointe de l'apex
    # Ventricule droit : bombement antéro-droit (côté −X, −Y)
    ajouter_element(mb, "ELLIPSOID", sur_axe(0.42) + Vector((-0.24, -0.28, 0.02)), (0.36, 0.26, 0.50), AXE_U, 4.0)
    # Bord inférieur (quasi rectiligne de l'apex vers le bord droit)
    ajouter_element(mb, "ELLIPSOID", (-0.12, -0.22, -0.60), (0.22, 0.20, 0.36), (0.95, 0.10, -0.60), 4.0)
    # Infundibulum (cône artériel du VD) : base du tronc pulmonaire
    ajouter_element(mb, "ELLIPSOID", (-0.02, -0.40, 0.26), (0.20, 0.17, 0.24), (0.15, -0.05, 1.0), 4.0)
    # Masse basale : tissu autour des racines aortique/pulmonaire
    ajouter_element(mb, "BALL", (-0.06, 0.12, 0.34), 0.28, None, 4.0)

    # --- Oreillettes (raideur plus forte → lobes distincts, sillon AV marqué)
    ajouter_element(mb, "ELLIPSOID", (-0.44, 0.10, 0.36), (0.27, 0.27, 0.33), (0, 0, 1), 6.0)          # oreillette droite
    ajouter_element(mb, "ELLIPSOID", (-0.32, -0.15, 0.46), (0.12, 0.13, 0.20), (1.0, -0.3, 0.1), 6.0)   # auricule droit
    ajouter_element(mb, "ELLIPSOID", (0.18, 0.45, 0.40), (0.36, 0.30, 0.32), (0, 0, 1), 6.0)            # oreillette gauche
    ajouter_element(mb, "ELLIPSOID", (0.42, -0.12, 0.42), (0.10, 0.11, 0.19), (-0.7, -0.7, 0.1), 6.0)   # auricule gauche

    obj_meta = bpy.data.objects.new("Myocarde_meta", mb)
    bpy.context.scene.collection.objects.link(obj_meta)

    # Métaballe → maillage
    me = maillage_evalue(obj_meta)
    bpy.data.objects.remove(obj_meta, do_unlink=True)
    bpy.data.metaballs.remove(mb)
    journal("métaballes → maillage :", len(me.vertices), "sommets")

    muscle = bpy.data.objects.new("Myocarde", me)
    bpy.context.scene.collection.objects.link(muscle)

    # Remaillage voxel (topologie propre et uniforme) + lissage léger
    rm = muscle.modifiers.new("Remesh", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = TAILLE_VOXEL
    rm.adaptivity = 0.0
    rm.use_smooth_shade = True
    sm = muscle.modifiers.new("Lissage", "SMOOTH")
    sm.factor = 0.5
    sm.iterations = 5
    appliquer_modificateurs(muscle)
    journal("remaillage voxel :", len(muscle.data.vertices), "sommets,", nombre_triangles(muscle.data), "triangles")

    muscle.data.materials.append(materiau)
    return muscle


# ---------------------------------------------------------------------------
# Sillons et projection sur la surface
# ---------------------------------------------------------------------------

def projeter(muscle, point):
    """Point le plus proche sur la surface du muscle et sa normale (Shrinkwrap « manuel »)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ok, loc, normale, _ = muscle.closest_point_on_mesh(Vector(point), depsgraph=dg)
    if not ok:
        return Vector(point), Vector((0, 0, 1))
    return loc.copy(), normale.copy()


def base_plan_axes():
    """Vecteurs unitaires du plan de la base (⊥ axe long) : ex ≈ +X (gauche patient), ey ≈ +Y (postérieur)."""
    ex = (Vector((1, 0, 0)) - Vector((1, 0, 0)).dot(AXE_U) * AXE_U).normalized()
    ey = ex.cross(AXE_U).normalized()
    if ey.y < 0:
        ey = -ey
    return ex, ey


def points_sillon_coronaire(muscle, n=180):
    """Sillon auriculo-ventriculaire : ellipse dans le plan de la base, projetée sur le muscle.

    Retourne (points, angles_deg). θ = 0 → gauche du patient (+X), 90 → postérieur,
    180 → droite du patient (−X), 270 → antérieur.
    """
    ex, ey = base_plan_axes()
    centre = Vector((-0.06, 0.06, 0.22))
    a, b = 0.66, 0.54
    points, angles = [], []
    for i in range(n):
        theta = 360.0 * i / n
        t = math.radians(theta)
        p = centre + a * math.cos(t) * ex + b * math.sin(t) * ey
        loc, _ = projeter(muscle, p)
        points.append(loc)
        angles.append(theta)
    return points, angles


def poids_sillon_coronaire(theta):
    """Le sillon AV n'est visible qu'en dehors du secteur antérieur (racines des gros
    vaisseaux, auricules) : pleine profondeur pour θ ∈ [40°, 235°], fondu de 25°."""
    def fondu(x):
        x = max(0.0, min(1.0, x))
        return x * x * (3 - 2 * x)
    return fondu((theta - 15.0) / 25.0) * fondu((260.0 - theta) / 25.0)


def points_sillon_anterieur(muscle, n=60):
    """Sillon interventriculaire antérieur : du bord de l'infundibulum jusqu'à l'apex (et un peu au-delà)."""
    p0 = Vector((-0.02, -0.62, 0.16))
    p1 = Vector((0.36, -0.36, -0.90))
    pts = []
    for i in range(n):
        t = i / (n - 1) * 1.08
        p = p0.lerp(p1, t) + Vector((-0.07, -0.12, 0.0)) * math.sin(math.pi * min(t, 1.0))
        loc, _ = projeter(muscle, p)
        pts.append(loc)
    return lisser_chemin(pts)


def points_sillon_posterieur(muscle, croix, n=55):
    """Sillon interventriculaire postérieur : de la croix (arrière du sillon AV) vers l'apex."""
    p1 = Vector((0.36, -0.02, -0.94))
    pts = []
    for i in range(n):
        t = i / (n - 1)
        p = Vector(croix).lerp(p1, t) + Vector((-0.06, 0.10, 0.0)) * math.sin(math.pi * t)
        loc, _ = projeter(muscle, p)
        pts.append(loc)
    return lisser_chemin(pts)


def creuser_sillons(muscle, sillons):
    """Déplace les sommets vers l'intérieur près des chemins donnés.

    sillons : liste de (points, poids_par_point, largeur, profondeur).
    Profil en cloche (1 − (d/l)²)² → creux doux sans arête.
    """
    me = muscle.data
    normales = [Vector(n.vector) for n in me.vertex_normals]
    deplacement = [0.0] * len(me.vertices)
    for points, poids, largeur, profondeur in sillons:
        kd = KDTree(len(points))
        for i, p in enumerate(points):
            kd.insert(p, i)
        kd.balance()
        for v in me.vertices:
            _, idx, dist = kd.find(v.co)
            if dist < largeur:
                t = 1.0 - (dist / largeur) ** 2
                deplacement[v.index] += profondeur * poids[idx] * t * t
    for v in me.vertices:
        d = deplacement[v.index]
        if d > 0.0:
            v.co -= normales[v.index] * d
    me.update()
    bpy.context.view_layer.update()


# ---------------------------------------------------------------------------
# Vaisseaux (courbes biseautées → maillage)
# ---------------------------------------------------------------------------

def creer_tube(nom, points, rayon, facteurs=None, type_spline="BEZIER",
               resolution_u=12, resolution_biseau=8, bouchons=True):
    """Courbe 3D biseautée le long de `points` (rayon relatif optionnel par point) → maillage."""
    cu = bpy.data.curves.new(nom, "CURVE")
    cu.dimensions = "3D"
    cu.fill_mode = "FULL"
    cu.bevel_depth = rayon
    cu.bevel_resolution = resolution_biseau   # 4 + 2·n sommets par anneau
    cu.resolution_u = resolution_u
    cu.use_fill_caps = bouchons
    cu.twist_mode = "MINIMUM"
    if facteurs is None:
        facteurs = [1.0] * len(points)

    if type_spline == "BEZIER":
        sp = cu.splines.new("BEZIER")
        sp.bezier_points.add(len(points) - 1)
        for bp, p, f in zip(sp.bezier_points, points, facteurs):
            bp.co = Vector(p)
            bp.handle_left_type = bp.handle_right_type = "AUTO"
            bp.radius = f
    else:  # NURBS : passe « au plus près » des points → très lisse pour les chemins denses
        sp = cu.splines.new("NURBS")
        sp.points.add(len(points) - 1)
        for pt, p, f in zip(sp.points, points, facteurs):
            pt.co = (p[0], p[1], p[2], 1.0)
            pt.radius = f
        sp.order_u = 4
        sp.use_endpoint_u = True
    sp.use_smooth = True

    obj = bpy.data.objects.new(nom, cu)
    bpy.context.scene.collection.objects.link(obj)
    me = maillage_evalue(obj)
    me.name = nom
    bpy.data.objects.remove(obj, do_unlink=True)
    bpy.data.curves.remove(cu)
    return me


def construire_arteres(materiau):
    """Aorte ascendante, crosse (avec tronc brachio-céphalique, carotide et sous-clavière gauches),
    aorte descendante coupée derrière l'oreillette gauche."""
    aorte = creer_tube("Aorte", [
        (-0.10, 0.06, 0.40),   # racine (dans la masse basale), bulbe
        (-0.11, 0.04, 0.66),   # aorte ascendante
        (-0.07, 0.04, 0.88),
        (0.06, 0.16, 1.08),    # sommet de la crosse
        (0.24, 0.42, 1.02),    # la crosse part vers l'arrière-gauche
        (0.32, 0.68, 0.82),
        (0.32, 0.80, 0.50),    # aorte descendante (section)
    ], RAYON_AORTE, facteurs=[1.15, 1.06, 1.0, 1.0, 0.96, 0.92, 0.90])
    tronc_bc = creer_tube("TroncBrachioCephalique", [(-0.04, 0.09, 0.98), (-0.09, 0.06, 1.16), (-0.13, 0.04, 1.32)],
                          RAYON_BRACHIOCEPHALIQUE, facteurs=[1.0, 1.0, 0.9], resolution_biseau=6)
    carotide = creer_tube("CarotideGauche", [(0.08, 0.16, 1.04), (0.08, 0.16, 1.20), (0.09, 0.17, 1.34)],
                          RAYON_BRANCHE_CROSSE, facteurs=[1.0, 1.0, 0.9], resolution_biseau=6)
    sous_clav = creer_tube("SousClaviereGauche", [(0.19, 0.28, 1.01), (0.24, 0.33, 1.16), (0.29, 0.38, 1.28)],
                           RAYON_BRANCHE_CROSSE, facteurs=[1.0, 1.0, 0.9], resolution_biseau=6)
    obj = fusionner_maillages("Arteres", [aorte, tronc_bc, carotide, sous_clav], materiau)
    return obj


def construire_veines(materiaux):
    """Veines caves, veines pulmonaires et tronc pulmonaire (teinte « Veine » par convention)."""
    tubes = []
    # Tronc pulmonaire : naît de l'infundibulum, monte devant l'aorte, se continue en artère pulmonaire gauche
    tubes.append(creer_tube("TroncPulmonaire", [
        (-0.02, -0.40, 0.30),
        (0.02, -0.41, 0.56),
        (0.10, -0.33, 0.78),
        (0.18, -0.22, 0.88),   # bifurcation
        (0.34, -0.12, 0.84),   # artère pulmonaire gauche
        (0.50, 0.00, 0.76),
        (0.62, 0.10, 0.66),
    ], RAYON_TRONC_PULMONAIRE, facteurs=[1.0, 1.0, 1.0, 0.95, 0.80, 0.74, 0.70]))
    # Artère pulmonaire droite : passe derrière l'aorte ascendante et la veine cave supérieure
    tubes.append(creer_tube("ArterePulmonaireDroite", [
        (0.18, -0.22, 0.88),
        (0.04, 0.06, 0.92),
        (-0.22, 0.30, 0.92),
        (-0.54, 0.34, 0.86),
    ], RAYON_ARTERE_PULMONAIRE, facteurs=[1.0, 1.0, 0.95, 0.9]))
    # Veine cave supérieure : verticale, au-dessus de l'oreillette droite
    tubes.append(creer_tube("VeineCaveSuperieure", [
        (-0.48, 0.12, 0.50), (-0.49, 0.12, 0.82), (-0.47, 0.13, 1.10),
    ], RAYON_VEINE_CAVE_SUP, facteurs=[1.0, 1.0, 0.95]))
    # Veine cave inférieure : sort par le bas / l'arrière de l'oreillette droite
    tubes.append(creer_tube("VeineCaveInferieure", [
        (-0.44, 0.20, 0.24), (-0.47, 0.30, 0.00), (-0.50, 0.40, -0.26),
    ], RAYON_VEINE_CAVE_INF, facteurs=[1.0, 1.0, 0.95]))
    # 4 veines pulmonaires : arrivent dans l'oreillette gauche par l'arrière
    for nom, depart, arrivee in (
        ("VeinePulmSupD", (0.00, 0.55, 0.50), (-0.24, 0.80, 0.58)),
        ("VeinePulmInfD", (0.00, 0.58, 0.32), (-0.24, 0.82, 0.24)),
        ("VeinePulmSupG", (0.36, 0.56, 0.50), (0.60, 0.76, 0.58)),
        ("VeinePulmInfG", (0.36, 0.58, 0.32), (0.60, 0.78, 0.24)),
    ):
        tubes.append(creer_tube(nom, [depart, arrivee], RAYON_VEINE_PULMONAIRE, resolution_biseau=5))

    tubes_veine = [t for t in tubes if not t.name.startswith(("TroncPulmonaire", "ArterePulmonaire"))]
    tubes_pulm = [t for t in tubes if t.name.startswith(("TroncPulmonaire", "ArterePulmonaire"))]
    if MATERIAU_TRONC_PULMONAIRE == "Veine":
        return [fusionner_maillages("Veines", tubes_veine + tubes_pulm, materiaux["Veine"])]
    return [fusionner_maillages("Veines", tubes_veine, materiaux["Veine"]),
            fusionner_maillages("TroncPulmonaire", tubes_pulm, materiaux["Artere"])]


# ---------------------------------------------------------------------------
# Coronaires
# ---------------------------------------------------------------------------

def plaquer(muscle, points, rayon, saillie=0.7):
    """Projette chaque point sur le muscle et le décale de saillie·rayon le long de la normale."""
    res = []
    for p in points:
        loc, n = projeter(muscle, p)
        res.append(loc + n * (saillie * rayon))
    return lisser_chemin(res, passes=1)


def selection_angulaire(points, angles, debut, fin, pas=1):
    """Sous-ensemble des points du sillon AV, de l'angle `debut` à `fin` (sens quelconque, modulo 360)."""
    n = len(points)
    i0 = int(round(debut / 360.0 * n)) % n
    i1 = int(round(fin / 360.0 * n)) % n
    sens = 1 if fin > debut else -1
    res, i = [], i0
    while True:
        res.append(points[i])
        if i == i1:
            break
        i = (i + sens) % n
    return res[::pas]


def construire_coronaires(muscle, materiau, sillon_av, angles_av, sillon_ant, sillon_post):
    tubes = []
    r, rb = RAYON_CORONAIRE, RAYON_CORONAIRE_BRANCHE

    # Coronaire droite : racine aortique antéro-droite → sillon AV droit → croix → IVP
    depart_cd = [Vector((-0.20, -0.12, 0.40)), Vector((-0.30, -0.28, 0.30))]
    chemin_cd = depart_cd + selection_angulaire(sillon_av, angles_av, 244, 96, pas=3) + sillon_post[2::3]
    tubes.append(creer_tube("CoronaireDroite", plaquer(muscle, chemin_cd, r), r,
                            type_spline="NURBS", resolution_u=4, resolution_biseau=3))
    # Branche marginale droite : descend le long du bord inférieur du VD
    idx_marg = len(depart_cd) + int(len(selection_angulaire(sillon_av, angles_av, 244, 96, pas=3)) * 0.35)
    origine = chemin_cd[idx_marg]
    chemin_marg = [origine + Vector((0.02, -0.06, -0.14)) * k + Vector((0.0, -0.02, -0.02)) * k * k for k in range(6)]
    tubes.append(creer_tube("MarginaleDroite", plaquer(muscle, chemin_marg, rb), rb,
                            type_spline="NURBS", resolution_u=4, resolution_biseau=3))

    # Tronc coronaire gauche (caché entre aorte et tronc pulmonaire) → IVA le long du sillon antérieur
    depart_cg = [Vector((0.08, -0.02, 0.40)), Vector((0.08, -0.30, 0.28))]
    chemin_iva = depart_cg + sillon_ant[1::2]
    tubes.append(creer_tube("Interventriculaire", plaquer(muscle, chemin_iva, r), r,
                            type_spline="NURBS", resolution_u=4, resolution_biseau=3))
    # Branche diagonale : quitte l'IVA vers la face antérieure du VG (à droite de l'observateur)
    origine = sillon_ant[16]
    chemin_diag = [origine + Vector((0.11, -0.01, -0.13)) * k + Vector((0.01, 0.02, -0.01)) * k * k for k in range(6)]
    tubes.append(creer_tube("Diagonale", plaquer(muscle, chemin_diag, rb), rb,
                            type_spline="NURBS", resolution_u=4, resolution_biseau=3))
    # Circonflexe : sous l'auricule gauche, dans le sillon AV gauche jusqu'à la face postérieure
    chemin_cx = [Vector((0.12, -0.04, 0.40))] + selection_angulaire(sillon_av, angles_av, 318, 420, pas=3)
    tubes.append(creer_tube("Circonflexe", plaquer(muscle, chemin_cx, r * 0.9), r * 0.9,
                            type_spline="NURBS", resolution_u=4, resolution_biseau=3))

    return fusionner_maillages("Coronaires", tubes, materiau)


# ---------------------------------------------------------------------------
# Finitions, normalisation, export
# ---------------------------------------------------------------------------

def finir_maillage(obj, angle_dur_deg=None):
    me = obj.data
    me.shade_smooth()
    if angle_dur_deg is not None and hasattr(me, "set_sharp_from_angle"):
        me.set_sharp_from_angle(angle=math.radians(angle_dur_deg))
    me.update()


def decimer_si_necessaire(obj, budget):
    n = nombre_triangles(obj.data)
    if n <= budget:
        return
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = budget / n
    mod.use_collapse_triangulate = True
    appliquer_modificateurs(obj)
    journal("décimation du muscle :", n, "→", nombre_triangles(obj.data), "triangles")


def boite_englobante(objets):
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    for o in objets:
        for v in o.data.vertices:
            co = o.matrix_world @ v.co
            for k in range(3):
                mins[k] = min(mins[k], co[k])
                maxs[k] = max(maxs[k], co[k])
    return mins, maxs


def normaliser(objets):
    """Centre la boîte englobante à l'origine et fixe la hauteur totale (appliqué aux sommets)."""
    mins, maxs = boite_englobante(objets)
    centre = (mins + maxs) * 0.5
    echelle = HAUTEUR_CIBLE / (maxs.z - mins.z)
    for o in objets:
        me = o.data
        for v in me.vertices:
            v.co = (v.co - centre) * echelle
        me.update()
    bpy.context.view_layer.update()
    journal("normalisation : centre", tuple(round(c, 3) for c in centre), "échelle %.3f" % echelle)


def exporter_glb(chemin):
    chemin = Path(chemin)
    chemin.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(chemin),
        export_format="GLB",
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_extras=False,
        use_selection=False,
        use_visible=False,
        use_renderable=False,
    )
    return chemin


# ---------------------------------------------------------------------------
# Aperçus (caméra + éclairage 3 points)
# ---------------------------------------------------------------------------

def configurer_monde(scene):
    monde = bpy.data.worlds.new("Monde")
    scene.world = monde
    if hasattr(monde, "use_nodes"):
        monde.use_nodes = True
    fond = next((n for n in monde.node_tree.nodes if n.type == "BACKGROUND"), None) if monde.node_tree else None
    if fond is not None:
        fond.inputs["Color"].default_value = (0.020, 0.021, 0.028, 1.0)
        fond.inputs["Strength"].default_value = 1.0
    monde.color = (0.02, 0.021, 0.028)


def direction_depuis_angles(azimut_deg, elevation_deg):
    """Vecteur unitaire cible→caméra. Azimut 0 = devant (−Y), sens horaire vu de dessus."""
    az, el = math.radians(azimut_deg), math.radians(elevation_deg)
    return Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))


def orienter_vers(obj, cible):
    obj.rotation_euler = (Vector(cible) - obj.location).to_track_quat("-Z", "Y").to_euler()


def creer_lumiere(nom, type_, position, cible, energie, couleur, taille):
    data = bpy.data.lights.new(nom, type_)
    data.energy = energie
    data.color = couleur
    if type_ == "AREA":
        data.shape = "SQUARE"
        data.size = taille
    obj = bpy.data.objects.new(nom, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = position
    orienter_vers(obj, cible)
    return obj


def installer_plateau(scene, cible, azimut, elevation, distance):
    """Caméra + éclairage 3 points (key / fill / rim) relatifs à l'azimut de la caméra."""
    for o in [o for o in scene.objects if o.type in ("CAMERA", "LIGHT")]:
        bpy.data.objects.remove(o, do_unlink=True)
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = 65
    cam_data.clip_end = 100
    cam = bpy.data.objects.new("Camera", cam_data)
    scene.collection.objects.link(cam)
    cam.location = cible + direction_depuis_angles(azimut, elevation) * distance
    orienter_vers(cam, cible)
    scene.camera = cam

    creer_lumiere("Key", "AREA", cible + direction_depuis_angles(azimut + 38, 38) * 4.2, cible, 900, (1.0, 0.95, 0.90), 2.2)
    creer_lumiere("Fill", "AREA", cible + direction_depuis_angles(azimut - 55, 12) * 4.8, cible, 260, (0.85, 0.90, 1.0), 3.5)
    creer_lumiere("Rim", "AREA", cible + direction_depuis_angles(azimut + 165, 40) * 4.0, cible, 700, (1.0, 0.97, 0.95), 1.5)


def regler_moteur(scene, moteur):
    scene.render.engine = moteur
    if moteur == "BLENDER_EEVEE":
        ev = scene.eevee
        ev.taa_render_samples = 48
        if hasattr(ev, "use_shadows"):
            ev.use_shadows = True
        if hasattr(ev, "use_raytracing"):
            ev.use_raytracing = False
    elif moteur == "BLENDER_WORKBENCH":
        sh = scene.display.shading
        sh.light = "STUDIO"
        sh.color_type = "MATERIAL"
        sh.show_cavity = True
        sh.cavity_type = "BOTH"
        sh.show_shadow = True
        sh.show_specular_highlight = True
        sh.show_object_outline = False
    elif moteur == "CYCLES":
        scene.cycles.samples = 48
        scene.cycles.device = "CPU"
        scene.cycles.use_denoising = True


def rendre_apercu(scene, chemin, moteurs, cible, azimut, elevation, distance):
    installer_plateau(scene, cible, azimut, elevation, distance)
    scene.render.filepath = str(chemin)
    for moteur in moteurs:
        try:
            regler_moteur(scene, moteur)
            t0 = time.time()
            bpy.ops.render.render(write_still=True)
            if os.path.exists(chemin) and os.path.getsize(chemin) > 0:
                journal("aperçu", chemin, "→", moteur, "(%.1fs)" % (time.time() - t0))
                return moteur
        except Exception as exc:  # moteur indisponible en headless : on passe au suivant
            journal("moteur", moteur, "indisponible :", str(exc)[:160])
    return None


def produire_apercus(dossier, moteur_prefere, extra_views):
    scene = bpy.context.scene
    dossier = Path(dossier)
    dossier.mkdir(parents=True, exist_ok=True)
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    for vt in ("AgX", "Filmic", "Standard"):
        try:
            scene.view_settings.view_transform = vt
            break
        except TypeError:
            continue
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    configurer_monde(scene)

    ordre = {"EEVEE": ["BLENDER_EEVEE", "BLENDER_WORKBENCH", "CYCLES"],
             "WORKBENCH": ["BLENDER_WORKBENCH", "CYCLES"],
             "CYCLES": ["CYCLES", "BLENDER_WORKBENCH"]}[moteur_prefere]
    cible = Vector((0.0, 0.0, -0.02))
    vues = [("heart_preview.png", 0, 8, 4.9),          # face antérieure
            ("heart_preview_back.png", 145, 18, 5.1)]   # 3/4 arrière (côté gauche du patient)
    if extra_views:
        vues += [("heart_preview_left.png", 90, 10, 5.0),     # côté gauche du patient (+X)
                 ("heart_preview_right.png", -90, 10, 5.0),   # côté droit (−X)
                 ("heart_preview_back_right.png", -145, 18, 5.1)]
    utilises = []
    for nom, az, el, dist in vues:
        utilises.append(rendre_apercu(scene, dossier / nom, ordre, cible, az, el, dist))
    return utilises


# ---------------------------------------------------------------------------
# Programme principal
# ---------------------------------------------------------------------------

def construire(options):
    t0 = time.time()
    journal("Blender", bpy.app.version_string)
    vider_scene()
    scene = bpy.context.scene
    scene.unit_settings.system = "METRIC"

    materiaux = creer_materiaux()

    # 1. Muscle
    muscle = construire_muscle(materiaux["Muscle"])

    # 2. Sillons (creusés avant les coronaires, qui viendront s'y loger)
    sillon_av, angles_av = points_sillon_coronaire(muscle)
    poids_av = [poids_sillon_coronaire(a) for a in angles_av]
    sillon_ant = points_sillon_anterieur(muscle)
    croix = sillon_av[int(round(96 / 360 * len(sillon_av)))]
    sillon_post = points_sillon_posterieur(muscle, croix)
    fondu_lineaire = lambda n: [min(1.0, 4.0 * i / n, 4.0 * (n - 1 - i) / n) for i in range(n)]  # noqa: E731
    creuser_sillons(muscle, [
        (sillon_av, poids_av, 0.11, 0.030),
        (sillon_ant, fondu_lineaire(len(sillon_ant)), 0.10, 0.026),
        (sillon_post, fondu_lineaire(len(sillon_post)), 0.10, 0.024),
    ])
    journal("sillons creusés")

    # 3. Vaisseaux
    arteres = construire_arteres(materiaux["Artere"])
    veines = construire_veines(materiaux)
    coronaires = construire_coronaires(muscle, materiaux["Coronaire"], sillon_av, angles_av, sillon_ant, sillon_post)

    # 4. Finitions
    decimer_si_necessaire(muscle, BUDGET_TRIANGLES_MUSCLE)
    finir_maillage(muscle)
    for o in [arteres, coronaires] + veines:
        finir_maillage(o, angle_dur_deg=50)

    parties = [muscle, arteres, coronaires] + veines
    normaliser(parties)

    racine = bpy.data.objects.new("Coeur", None)
    scene.collection.objects.link(racine)
    for o in parties:
        o.parent = racine

    # 5. Export
    chemin_glb = exporter_glb(options["out"])

    # 6. Statistiques
    mins, maxs = boite_englobante(parties)
    total = 0
    for o in parties:
        n = nombre_triangles(o.data)
        total += n
        journal("  %-12s %6d triangles  matériau=%s" % (o.name, n, o.data.materials[0].name))
    journal("triangles totaux :", total)
    journal("boîte englobante Blender : min", tuple(round(c, 3) for c in mins), "max", tuple(round(c, 3) for c in maxs))
    journal("dimensions (X, Y, Z) :", tuple(round(maxs[k] - mins[k], 3) for k in range(3)))
    journal("GLB :", chemin_glb, "(%d octets)" % os.path.getsize(chemin_glb))
    journal("construction en %.1fs" % (time.time() - t0))

    # 7. Aperçus
    if options["render"]:
        moteurs = produire_apercus(options["preview_dir"], options["engine"], options["extra_views"])
        journal("moteurs utilisés pour les aperçus :", moteurs)


if __name__ == "__main__":
    construire(lire_options())
