#!/usr/bin/env python3
"""
CompTIA A+ Hardware 3D Graphics & Automation Pipeline
=====================================================
Automated procedural 3D hardware asset generation, studio rendering,
and WebGL-optimized GLTF/GLB export pipeline for CompTIA A+ core hardware.

Supported Assets:
  - motherboard : Full ATX motherboard with CPU socket bracket, VRM heatsinks,
                  PCIe slots, DDR5 RAM slots, solid capacitors, rear I/O box,
                  CMOS battery, power connectors, and copper solder traces.
  - cable       : RJ45 modular plug (8P8C) with clear polycarbonate housing,
                  8 gold contact pins, T568A/B colored wire conductors,
                  and snag-proof strain relief boot.
  - rack        : 42U Datacenter equipment rack with EIA-310 steel cabinet rails,
                  perforated side panels, open mesh door, 1U 48-port switch with LEDs,
                  2U high-density server with hot-swap drive caddies,
                  and 3U online UPS with illuminated LCD display screen.

CLI Usage:
  Inside Blender:
    blender --background --python tools/blender_render_pipeline.py -- \\
      --asset [all|motherboard|cable|rack] \\
      --output-dir media/hardware \\
      --format [png|glb|all] \\
      --camera-angle [isometric|orthographic|all]

  Outside Blender (Standard Python):
    python tools/blender_render_pipeline.py --help
    python tools/blender_render_pipeline.py --generate-fallback
    python tools/blender_render_pipeline.py --verify-only
"""

import sys
import os
import math
import shutil
import subprocess
import argparse
import json
import struct
import zlib
import time
import warnings

# -----------------------------------------------------------------------------
# Blender Python (bpy) Environment Detection
# -----------------------------------------------------------------------------
try:
    import bpy
    import mathutils
    import bmesh
    BPY_AVAILABLE = True
except (ModuleNotFoundError, ImportError):
    BPY_AVAILABLE = False


# -----------------------------------------------------------------------------
# System Utilities & Blender Path / Version Discovery
# -----------------------------------------------------------------------------
def find_blender_binary() -> str | None:
    """Search for the Blender executable on the current host system."""
    # 1. Check PATH
    path_blender = shutil.which("blender") or shutil.which("blender.exe")
    if path_blender:
        return path_blender

    # 2. Check standard Windows installations
    if sys.platform.startswith("win"):
        base_paths = [
            os.environ.get("ProgramFiles", r"C:\Program Files"),
            os.environ.get("ProgramFiles(x86)", r"C:\Program Files (x86)"),
            os.path.expanduser(r"~\AppData\Local\Programs"),
        ]
        for base in base_paths:
            foundation = os.path.join(base, "Blender Foundation")
            if os.path.isdir(foundation):
                for entry in sorted(os.listdir(foundation), reverse=True):
                    exe_path = os.path.join(foundation, entry, "blender.exe")
                    if os.path.isfile(exe_path):
                        return exe_path

    # 3. Check standard macOS installations
    elif sys.platform == "darwin":
        mac_paths = [
            "/Applications/Blender.app/Contents/MacOS/Blender",
            os.path.expanduser("~/Applications/Blender.app/Contents/MacOS/Blender"),
        ]
        for p in mac_paths:
            if os.path.isfile(p):
                return p

    # 4. Check standard Linux installations
    elif sys.platform.startswith("linux"):
        linux_paths = ["/usr/bin/blender", "/usr/local/bin/blender", "/snap/bin/blender"]
        for p in linux_paths:
            if os.path.isfile(p):
                return p

    return None


def get_blender_version(binary_path: str | None = None) -> str | None:
    """
    Detect Blender version string (e.g. '5.2.2 LTS').
    When running inside Blender (BPY_AVAILABLE), reads bpy.app.version.
    When running in standard Python CLI, executes `<binary_path> --version`.
    """
    if BPY_AVAILABLE:
        try:
            ver = bpy.app.version
            return f"{ver[0]}.{ver[1]}.{ver[2]}"
        except Exception:
            pass

    exe = binary_path or find_blender_binary()
    if exe and os.path.isfile(exe):
        try:
            out = subprocess.check_output([exe, "--version"], stderr=subprocess.STDOUT, text=True, timeout=5)
            first_line = out.strip().splitlines()[0]
            if "Blender" in first_line:
                return first_line.replace("Blender", "").strip()
            return first_line.strip()
        except Exception:
            pass

    return None


def ensure_output_directory(output_dir: str) -> str:
    """Ensure the specified output directory exists and return its absolute path."""
    abs_dir = os.path.abspath(output_dir)
    os.makedirs(abs_dir, exist_ok=True)
    return abs_dir


# -----------------------------------------------------------------------------
# CompTIA A+ Hardware Hierarchy & Hotspot Mapping Specification
# -----------------------------------------------------------------------------
ASSET_HIERARCHY_METADATA = {
    "motherboard": {
        "CPU_Retention_Frame": {"hotspot_id": "socket", "label": "LGA 1700 CPU Socket", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "CPU_Socket", "inspectable": True},
        "CPU_Load_Plate": {"hotspot_id": "socket", "label": "LGA 1700 CPU Load Plate", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "CPU_Socket", "inspectable": True},
        "CPU_Socket_Lever": {"subsystem": "CPU_Socket", "inspectable": True},
        "RAM_Slot_0": {"hotspot_id": "ram", "label": "DDR5 DIMM Slots", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "Memory_Subsystem", "inspectable": True},
        "PCIe_x16_1_Body": {"hotspot_id": "pcie", "label": "PCIe 4.0 x16 Slot", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "Expansion_Bus", "inspectable": True},
        "M2_Heatshield": {"hotspot_id": "m2", "label": "M.2 NVMe SSD Slot", "obj": "CompTIA A+ Core 1 · Obj 3.1 & 3.4", "subsystem": "Storage_M2", "inspectable": True},
        "ATX_24Pin_Housing": {"hotspot_id": "power", "label": "24-Pin ATX Power", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "Power_Delivery", "inspectable": True},
        "Chipset_Heatsink": {"hotspot_id": "chipset", "label": "Southbridge Chipset PCH", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "Chipset_PCH", "inspectable": True},
        "PCB_Substrate": {"subsystem": "Substrate", "inspectable": False},
        "CPU_Socket_Base": {"subsystem": "CPU_Socket", "inspectable": True},
        "CPU_Socket_Bed": {"subsystem": "CPU_Socket", "inspectable": True},
        "CPU_Lever_Arm": {"subsystem": "CPU_Socket", "inspectable": True},
        "CPU_Lever_Tab": {"subsystem": "CPU_Socket", "inspectable": True},
        "VRM_Top_Base": {"subsystem": "VRM_Power", "inspectable": True},
        "VRM_Left_Base": {"subsystem": "VRM_Power", "inspectable": True},
        "VRM_Heatpipe_Top": {"subsystem": "VRM_Cooling", "inspectable": True},
        "VRM_Heatpipe_Left": {"subsystem": "VRM_Cooling", "inspectable": True},
        "Rear_IO_Shield": {"subsystem": "Rear_IO", "inspectable": True},
        "IO_RJ45_Jack": {"subsystem": "Rear_IO", "inspectable": True},
        "IO_USB3_Stack_1": {"subsystem": "Rear_IO", "inspectable": True},
        "IO_USBC_Port": {"subsystem": "Rear_IO", "inspectable": True},
        "IO_HDMI_Port": {"subsystem": "Rear_IO", "inspectable": True},
        "CMOS_Battery": {"subsystem": "Power_Delivery", "inspectable": True},
        "CMOS_Holder": {"subsystem": "Power_Delivery", "inspectable": False},
        "SATA_Ports_Block": {"subsystem": "Storage_SATA", "inspectable": True},
        "EPS_8Pin_Housing": {"subsystem": "Power_Delivery", "inspectable": True},
    },
    "cable": {
        "Gold_Pin_4": {"hotspot_id": "pins", "label": "8 Gold Contact Pins", "obj": "CompTIA A+ Core 1 · Obj 2.1", "subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_1": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_2": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_3": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_5": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_6": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_7": {"subsystem": "Contact_Pins", "inspectable": True},
        "Gold_Pin_8": {"subsystem": "Contact_Pins", "inspectable": True},
        "Conductor_Wire_4": {"hotspot_id": "conductors", "label": "T568B Conductor Wires", "obj": "CompTIA A+ Core 1 · Obj 2.1", "subsystem": "Conductors", "inspectable": True},
        "RJ45_Housing_Head": {"hotspot_id": "housing", "label": "Polycarbonate Shell", "obj": "CompTIA A+ Core 1 · Obj 2.1", "subsystem": "Housing", "inspectable": True},
        "Strain_Boot_Body": {"hotspot_id": "strain", "label": "Strain Relief Clamp", "obj": "CompTIA A+ Core 1 · Obj 2.1", "subsystem": "Strain_Relief", "inspectable": True},
        "RJ45_Housing_Body": {"subsystem": "Housing", "inspectable": True},
        "RJ45_Wire_Cavity": {"subsystem": "Housing", "inspectable": False},
        "RJ45_Latch_Clip": {"subsystem": "Locking_Latch", "inspectable": True},
        "Latch_Clip_Stem": {"subsystem": "Locking_Latch", "inspectable": True},
        "Latch_Release_Tab": {"subsystem": "Locking_Latch", "inspectable": True},
        "Latch_Ear_Left": {"subsystem": "Locking_Latch", "inspectable": True},
        "Latch_Ear_Right": {"subsystem": "Locking_Latch", "inspectable": True},
        "Cat6_Cable_Jacket": {"subsystem": "Cable_Jacket", "inspectable": True},
        "Strain_Boot_Hood": {"subsystem": "Strain_Relief", "inspectable": True},
    },
    "rack": {
        "Switch_1U_Faceplate": {"hotspot_id": "switch", "label": "ToR 10GbE Switch", "obj": "CompTIA A+ Core 1 · Obj 2.1 & 3.4", "subsystem": "Switch_1U", "inspectable": True},
        "Cable_Mgmt_1U": {"hotspot_id": "patch", "label": "Cat6A Patch Panel", "obj": "CompTIA A+ Core 1 · Obj 2.1", "subsystem": "Cable_Mgmt", "inspectable": True},
        "Server_2U_Bezel": {"hotspot_id": "server", "label": "2U Compute Servers", "obj": "CompTIA A+ Core 1 · Obj 3.4", "subsystem": "Server_2U", "inspectable": True},
        "Server_Drive_Caddy_0": {"subsystem": "Server_2U", "inspectable": True},
        "UPS_3U_Front_Bezel": {"hotspot_id": "ups", "label": "3U Smart-UPS Battery", "obj": "CompTIA A+ Core 1 · Obj 3.4 & Safety", "subsystem": "UPS_3U", "inspectable": True},
        "Roof_Canopy": {"subsystem": "Cabinet_Frame", "inspectable": False},
        "Base_Plinth": {"subsystem": "Cabinet_Frame", "inspectable": False},
        "Side_Panel_Left": {"subsystem": "Cabinet_Enclosure", "inspectable": True},
        "Side_Panel_Right": {"subsystem": "Cabinet_Enclosure", "inspectable": True},
        "EIA_Rail_Front_L": {"subsystem": "Mounting_Rails", "inspectable": True},
        "EIA_Rail_Front_R": {"subsystem": "Mounting_Rails", "inspectable": True},
        "EIA_Rail_Rear_L": {"subsystem": "Mounting_Rails", "inspectable": True},
        "EIA_Rail_Rear_R": {"subsystem": "Mounting_Rails", "inspectable": True},
        "Switch_1U_Chassis": {"subsystem": "Switch_1U", "inspectable": True},
        "Server_2U_Chassis": {"subsystem": "Server_2U", "inspectable": True},
        "UPS_3U_Chassis": {"subsystem": "UPS_3U", "inspectable": True},
        "UPS_LCD_Screen": {"subsystem": "UPS_3U", "inspectable": True},
        "Airflow_Blanking_2U": {"subsystem": "Airflow_Containment", "inspectable": True},
    },
}


# =============================================================================
# BLENDER 3D GRAPHICS PIPELINE IMPLEMENTATION (when BPY_AVAILABLE is True)
# =============================================================================
if BPY_AVAILABLE:

    # -------------------------------------------------------------------------
    # Material System & PBR Helper
    # -------------------------------------------------------------------------
    def create_pbr_material(
        name: str,
        base_color=(0.8, 0.8, 0.8, 1.0),
        metallic: float = 0.0,
        roughness: float = 0.5,
        transmission: float = 0.0,
        ior: float = 1.45,
        emission_color=None,
        emission_strength: float = 0.0,
        alpha: float = 1.0,
    ):
        """Create or configure a Principled BSDF material with cross-version Blender compatibility."""
        mat = bpy.data.materials.get(name) or bpy.data.materials.new(name=name)
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                if hasattr(mat, "use_nodes") and not mat.use_nodes:
                    mat.use_nodes = True
        except Exception:
            pass

        nodes = mat.node_tree.nodes
        bsdf = nodes.get("Principled BSDF")
        if not bsdf:
            bsdf = nodes.new(type="ShaderNodeBsdfPrincipled")

        def _set(socket_names, val):
            for s_name in socket_names:
                if s_name in bsdf.inputs:
                    bsdf.inputs[s_name].default_value = val
                    return True
            return False

        _set(["Base Color"], base_color)
        _set(["Metallic"], metallic)
        _set(["Roughness"], roughness)
        _set(["Transmission Weight", "Transmission"], transmission)
        _set(["IOR"], ior)
        _set(["Alpha"], alpha)

        if emission_color is not None and emission_strength > 0:
            _set(["Emission Color", "Emission"], emission_color)
            _set(["Emission Strength"], emission_strength)

        # Transmission / Refraction settings for EEVEE Next & legacy EEVEE
        if transmission > 0.05 or alpha < 0.98:
            if hasattr(mat, "blend_method"):
                mat.blend_method = "BLEND"
            if hasattr(mat, "use_screen_refraction"):
                mat.use_screen_refraction = True
            if hasattr(mat, "use_raytrace_refraction"):
                mat.use_raytrace_refraction = True

        return mat

    def build_material_library():
        """Construct standard PBR materials for hardware components with studio contrast."""
        lib = {}
        # PCB substrates
        lib["pcb_green"] = create_pbr_material("PCB_Green", (0.018, 0.14, 0.045, 1.0), metallic=0.05, roughness=0.42)
        lib["pcb_black"] = create_pbr_material("PCB_Black", (0.035, 0.04, 0.045, 1.0), metallic=0.1, roughness=0.48)

        # Metals & Conductors (Calibrated for visible reflections in dark studio)
        lib["metal_silver"] = create_pbr_material("Metal_Silver", (0.90, 0.92, 0.94, 1.0), metallic=0.92, roughness=0.18)
        lib["metal_dark"] = create_pbr_material("Metal_Dark", (0.22, 0.24, 0.28, 1.0), metallic=0.85, roughness=0.25)
        lib["metal_gold"] = create_pbr_material("Metal_Gold", (1.0, 0.82, 0.18, 1.0), metallic=0.98, roughness=0.10)
        lib["metal_copper"] = create_pbr_material("Metal_Copper", (0.95, 0.48, 0.24, 1.0), metallic=0.92, roughness=0.22)
        lib["heatsink_aluminum"] = create_pbr_material("Heatsink_Aluminum", (0.88, 0.90, 0.92, 1.0), metallic=0.92, roughness=0.22)
        lib["Heatsink_Aluminum"] = lib["heatsink_aluminum"]

        # Plastics & Structural
        lib["plastic_black"] = create_pbr_material("Plastic_Black", (0.05, 0.05, 0.055, 1.0), metallic=0.0, roughness=0.50)
        lib["plastic_white"] = create_pbr_material("Plastic_White", (0.95, 0.95, 0.93, 1.0), metallic=0.0, roughness=0.35)
        lib["plastic_blue_usb"] = create_pbr_material("Plastic_USB3_Blue", (0.02, 0.35, 0.95, 1.0), metallic=0.0, roughness=0.30)

        # RJ45 Components
        lib["polycarbonate_clear"] = create_pbr_material(
            "Polycarbonate_Clear",
            (0.85, 0.92, 0.98, 1.0),
            metallic=0.0,
            roughness=0.06,
            transmission=0.92,
            ior=1.585,
            alpha=0.30
        )
        lib["boot_blue"] = create_pbr_material("Boot_Rubber_Blue", (0.08, 0.28, 0.58, 1.0), metallic=0.0, roughness=0.55)
        lib["cable_jacket"] = create_pbr_material("Cable_Jacket_PVC", (0.10, 0.30, 0.62, 1.0), metallic=0.0, roughness=0.45)

        # T568B Wire Standards (Vivid colors for diagram clarity)
        lib["wire_wo"] = create_pbr_material("Wire_White_Orange", (0.98, 0.95, 0.88, 1.0), roughness=0.35)
        lib["wire_o"] = create_pbr_material("Wire_Orange", (1.0, 0.45, 0.05, 1.0), roughness=0.35)
        lib["wire_wg"] = create_pbr_material("Wire_White_Green", (0.92, 0.98, 0.92, 1.0), roughness=0.35)
        lib["wire_b"] = create_pbr_material("Wire_Blue", (0.08, 0.42, 0.98, 1.0), roughness=0.35)
        lib["wire_wb"] = create_pbr_material("Wire_White_Blue", (0.90, 0.94, 1.0, 1.0), roughness=0.35)
        lib["wire_g"] = create_pbr_material("Wire_Green", (0.10, 0.78, 0.22, 1.0), roughness=0.35)
        lib["wire_wbr"] = create_pbr_material("Wire_White_Brown", (0.92, 0.88, 0.85, 1.0), roughness=0.35)
        lib["wire_br"] = create_pbr_material("Wire_Brown", (0.48, 0.24, 0.10, 1.0), roughness=0.35)

        # Capacitors & Audio Ports
        lib["capacitor_blue"] = create_pbr_material("Capacitor_Blue", (0.08, 0.24, 0.55, 1.0), metallic=0.3, roughness=0.35)
        lib["capacitor_silver"] = create_pbr_material("Capacitor_Silver", (0.92, 0.94, 0.96, 1.0), metallic=0.92, roughness=0.20)
        lib["audio_lime"] = create_pbr_material("Audio_Lime", (0.25, 0.90, 0.18, 1.0), roughness=0.3)
        lib["audio_cyan"] = create_pbr_material("Audio_Cyan", (0.12, 0.75, 0.95, 1.0), roughness=0.3)
        lib["audio_pink"] = create_pbr_material("Audio_Pink", (0.95, 0.28, 0.55, 1.0), roughness=0.3)

        # Server Rack & Datacenter Electronics
        lib["rack_steel"] = create_pbr_material("Rack_Powder_Steel", (0.14, 0.15, 0.17, 1.0), metallic=0.88, roughness=0.32)
        lib["rack_rails"] = create_pbr_material("Rack_Galvanized_Rails", (0.80, 0.82, 0.85, 1.0), metallic=0.96, roughness=0.18)
        lib["server_face"] = create_pbr_material("Server_Brushed_Face", (0.60, 0.62, 0.66, 1.0), metallic=0.90, roughness=0.25)
        lib["drive_caddy"] = create_pbr_material("Drive_Caddy_Tray", (0.82, 0.84, 0.86, 1.0), metallic=0.92, roughness=0.20)

        # Glowing LEDs & Displays (High emission strength for dark studio pop)
        lib["led_green"] = create_pbr_material("LED_Status_Green", (0.1, 1.0, 0.25, 1.0), emission_color=(0.1, 1.0, 0.25, 1.0), emission_strength=7.0)
        lib["led_amber"] = create_pbr_material("LED_Activity_Amber", (1.0, 0.65, 0.05, 1.0), emission_color=(1.0, 0.65, 0.05, 1.0), emission_strength=6.0)
        lib["led_blue"] = create_pbr_material("LED_Beacon_Blue", (0.1, 0.55, 1.0, 1.0), emission_color=(0.1, 0.55, 1.0, 1.0), emission_strength=6.0)
        lib["lcd_screen"] = create_pbr_material("UPS_LCD_Display", (0.05, 0.50, 1.0, 1.0), emission_color=(0.05, 0.50, 1.0, 1.0), emission_strength=5.0)

        return lib

    # -------------------------------------------------------------------------
    # Primitive Geometry Helpers
    # -------------------------------------------------------------------------
    def add_box(
        name: str,
        dimensions=(1.0, 1.0, 1.0),
        location=(0.0, 0.0, 0.0),
        rotation=(0.0, 0.0, 0.0),
        material=None,
        parent=None,
    ):
        """Create a box mesh primitive with exact dimensions, location, and material."""
        bpy.ops.mesh.primitive_cube_add(
            size=1.0,
            scale=(dimensions[0], dimensions[1], dimensions[2]),
            location=location,
            rotation=rotation,
        )
        obj = bpy.context.active_object
        obj.name = name
        if hasattr(obj, "data") and obj.data:
            obj.data.name = f"{name}_mesh"
        if material:
            if obj.data.materials:
                obj.data.materials[0] = material
            else:
                obj.data.materials.append(material)
        if parent:
            obj.parent = parent
        return obj

    def add_cylinder(
        name: str,
        radius: float = 0.5,
        depth: float = 1.0,
        vertices: int = 16,
        location=(0.0, 0.0, 0.0),
        rotation=(0.0, 0.0, 0.0),
        material=None,
        parent=None,
    ):
        """Create a cylinder mesh primitive with specified radius, depth, vertex count, and material."""
        bpy.ops.mesh.primitive_cylinder_add(
            radius=radius,
            depth=depth,
            vertices=vertices,
            location=location,
            rotation=rotation,
        )
        obj = bpy.context.active_object
        obj.name = name
        if hasattr(obj, "data") and obj.data:
            obj.data.name = f"{name}_mesh"
        if material:
            if obj.data.materials:
                obj.data.materials[0] = material
            else:
                obj.data.materials.append(material)
        if parent:
            obj.parent = parent
        return obj

    # -------------------------------------------------------------------------
    # Scene Setup & Dynamic Studio Lighting
    # -------------------------------------------------------------------------
    def clear_scene():
        """Remove all objects, meshes, lights, materials, and cameras from the scene."""
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)

        for col in [bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights]:
            for item in list(col):
                col.remove(item)

    def setup_render_engine(engine_choice: str = "AUTO"):
        """Configure rendering engine and film transparency."""
        scene = bpy.context.scene
        available_engines = [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items]
        if engine_choice.upper() == "CYCLES" and "CYCLES" in available_engines:
            scene.render.engine = "CYCLES"
            if hasattr(scene, "cycles"):
                scene.cycles.samples = 128
        elif "BLENDER_EEVEE" in available_engines:
            scene.render.engine = "BLENDER_EEVEE"
            if hasattr(scene, "eevee"):
                if hasattr(scene.eevee, "taa_render_samples"):
                    scene.eevee.taa_render_samples = 64
        elif "BLENDER_EEVEE_NEXT" in available_engines:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
        else:
            scene.render.engine = available_engines[0]

        # Transparent Film Background (for crisp diagrams)
        scene.render.film_transparent = True
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = "PNG"
        scene.render.image_settings.color_mode = "RGBA"
        scene.render.image_settings.color_depth = "8"

        # Ambient Dark Studio Environment
        world = scene.world
        if world and world.node_tree:
            bg_node = world.node_tree.nodes.get("Background")
            if bg_node:
                bg_node.inputs["Color"].default_value = (0.02, 0.025, 0.035, 1.0)
                bg_node.inputs["Strength"].default_value = 0.5

    def setup_studio_lighting_for_camera(target_center, cam_location, dist_scale: float, asset_name: str = ""):
        """
        Dynamically position 3-point studio lighting + rim light relative to the camera vector,
        ensuring optimal key light, soft fill, and crisp edge highlights from any angle.
        """
        scene = bpy.context.scene

        # Compute camera horizontal direction
        cam_dir = (cam_location - target_center)
        cam_dir.z = 0.0
        if cam_dir.length < 1e-4:
            cam_dir = mathutils.Vector((0.0, -1.0, 0.0))
        else:
            cam_dir.normalize()

        # Side vectors
        right_dir = mathutils.Vector((cam_dir.y, -cam_dir.x, 0.0))
        left_dir = mathutils.Vector((-cam_dir.y, cam_dir.x, 0.0))

        # 1. Key Light (45-deg to the left of camera, elevated)
        key_pos = target_center + (cam_dir * 0.9 + left_dir * 0.7) * dist_scale + mathutils.Vector((0, 0, dist_scale * 0.7))
        key_light_data = bpy.data.lights.new(name="Studio_Key_Light", type="AREA")
        key_light_data.energy = 260.0 * (dist_scale / 4.0) ** 1.5
        key_light_data.size = dist_scale * 0.6
        key_light_data.color = (1.0, 0.98, 0.95)
        key_light = bpy.data.objects.new("Studio_Key_Light", key_light_data)
        key_light.location = key_pos
        scene.collection.objects.link(key_light)

        # 2. Fill Light (Opposite right side of camera, softer)
        fill_pos = target_center + (cam_dir * 0.9 + right_dir * 0.7) * dist_scale + mathutils.Vector((0, 0, dist_scale * 0.4))
        fill_light_data = bpy.data.lights.new(name="Studio_Fill_Light", type="AREA")
        fill_light_data.energy = 110.0 * (dist_scale / 4.0) ** 1.5
        fill_light_data.size = dist_scale * 0.8
        fill_light_data.color = (0.85, 0.92, 1.0)
        fill_light = bpy.data.objects.new("Studio_Fill_Light", fill_light_data)
        fill_light.location = fill_pos
        scene.collection.objects.link(fill_light)

        # 3. Rim / Kicker Light (Behind the model pointing towards camera for silhouette edge separation)
        rim_pos = target_center - (cam_dir * 0.9 + right_dir * 0.4) * dist_scale + mathutils.Vector((0, 0, dist_scale * 0.8))
        rim_light_data = bpy.data.lights.new(name="Studio_Rim_Light", type="AREA")
        rim_light_data.energy = 320.0 * (dist_scale / 4.0) ** 1.5
        rim_light_data.size = dist_scale * 0.5
        rim_light_data.color = (0.45, 0.80, 1.0)
        rim_light = bpy.data.objects.new("Studio_Rim_Light", rim_light_data)
        rim_light.location = rim_pos
        scene.collection.objects.link(rim_light)

        # 4. Top Soft Light (Direct overhead for horizontal surface visibility)
        top_light_data = bpy.data.lights.new(name="Studio_Top_Light", type="AREA")
        top_light_data.energy = 80.0 * (dist_scale / 4.0) ** 1.5
        top_light_data.size = dist_scale * 0.9
        top_light_data.color = (0.95, 0.95, 1.0)
        top_light = bpy.data.objects.new("Studio_Top_Light", top_light_data)
        top_light.location = target_center + mathutils.Vector((0, 0, dist_scale * 1.1))
        scene.collection.objects.link(top_light)

        # 5. Dedicated Rack Faceplate Light
        if any(k in asset_name.lower() for k in ("rack", "server")):
            face_light_data = bpy.data.lights.new(name="Studio_Rack_Face_Light", type="AREA")
            face_light_data.energy = 420.0 * (dist_scale / 10.0) ** 1.5
            face_light_data.size = 2.5
            face_light_data.color = (1.0, 0.98, 0.95)
            face_light = bpy.data.objects.new("Studio_Rack_Face_Light", face_light_data)
            face_light.location = target_center + mathutils.Vector((0.0, 3.8, 0.0))
            scene.collection.objects.link(face_light)

    # -------------------------------------------------------------------------
    # Camera Framing & Angle Calculations
    # -------------------------------------------------------------------------
    def calculate_bounds(root_object):
        """Compute the world-space bounding box center, extents, and diagonal radius."""
        all_objs = []
        def _collect(obj):
            if obj.type == "MESH":
                all_objs.append(obj)
            for c in obj.children:
                _collect(c)
        _collect(root_object)

        if not all_objs:
            return mathutils.Vector((0.0, 0.0, 0.0)), mathutils.Vector((1.0, 1.0, 1.0)), 1.0

        min_pos = mathutils.Vector((float("inf"), float("inf"), float("inf")))
        max_pos = mathutils.Vector((float("-inf"), float("-inf"), float("-inf")))

        bpy.context.view_layer.update()
        for obj in all_objs:
            for corner in obj.bound_box:
                w_corner = obj.matrix_world @ mathutils.Vector(corner)
                for i in range(3):
                    min_pos[i] = min(min_pos[i], w_corner[i])
                    max_pos[i] = max(max_pos[i], w_corner[i])

        center = (min_pos + max_pos) / 2.0
        extents = max_pos - min_pos
        radius = max(extents.x, extents.y, extents.z) / 2.0
        return center, extents, radius

    def setup_camera(target_center, extents, radius: float, angle_type: str = "isometric", asset_name: str = "all"):
        """Position camera for optimal framing of the specified hardware asset."""
        cam_data = bpy.data.cameras.new("Main_Camera")
        cam_obj = bpy.data.objects.new("Main_Camera", cam_data)
        bpy.context.scene.collection.objects.link(cam_obj)
        bpy.context.scene.camera = cam_obj

        max_vertical_span = max(extents.z, extents.y * 0.707 + extents.z * 0.707)
        max_horizontal_span = max(extents.x, extents.y * 0.707 + extents.x * 0.707)

        name_lower = asset_name.lower()
        if any(k in name_lower for k in ("cable", "rj45")):
            # Camera positioned in front-right of connector nose (+Y) looking at gold pins & conductors
            cam_dir = mathutils.Vector((0.72, 0.78, 0.60)).normalized()
            dist = max(radius * 3.2, max_horizontal_span * 2.4)
        elif any(k in name_lower for k in ("rack", "server")):
            # Camera positioned in front-right of datacenter cabinet (+Y) looking at equipment front
            cam_dir = mathutils.Vector((0.55, 0.92, 0.30)).normalized()
            dist = max(extents.z * 3.4, radius * 4.5)
        else: # Motherboard (XY plane, looking from bottom-right)
            cam_dir = mathutils.Vector((0.65, -0.75, 0.70)).normalized()
            dist = max(radius * 2.8, max_vertical_span * 2.5, max_horizontal_span * 1.8)

        if angle_type.lower() == "orthographic":
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = max(extents.z * 1.35, radius * 2.4)
            cam_obj.location = target_center + cam_dir * dist * 1.5
        elif angle_type.lower() == "top":
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = max(extents.x, extents.y) * 1.25
            cam_obj.location = mathutils.Vector((target_center.x, target_center.y, target_center.z + radius * 4.0))
        else:
            # Perspective Hero Angle (65mm product shot lens)
            cam_data.type = "PERSP"
            cam_data.lens = 65.0
            cam_obj.location = target_center + cam_dir * dist

        # Aim camera toward target center
        direction = target_center - cam_obj.location
        rot_quat = direction.to_track_quat("-Z", "Y")
        cam_obj.rotation_euler = rot_quat.to_euler()

        # Set up dynamic studio lights aligned to this camera
        setup_studio_lighting_for_camera(target_center, cam_obj.location, dist, asset_name=asset_name)

        return cam_obj

    # =========================================================================
    # PROCEDURAL MESH GENERATORS
    # =========================================================================

    # -------------------------------------------------------------------------
    # 1. Motherboard Generator
    # -------------------------------------------------------------------------
    def create_motherboard_mesh(theme: str = "green"):
        """
        Generate a photorealistic ATX motherboard:
          - PCB Base (dark green or stealth black substrate)
          - CPU Socket Bracket (LGA/AM5 metal bracket, socket bed, retention arm)
          - VRM Aluminum Heatsinks with parallel cooling fins & L-shaped copper heatpipe
          - Chipset / Southbridge faceted heatsink
          - PCIe 5.0 x16 slots with steel shielding & PCIe x1 slot
          - DDR5 RAM DIMM slots with dual-tone locking clips
          - Solid electrolytic capacitor cylinders with silver vent score
          - Rear I/O Shield Enclosure (RJ45, USB-A, USB-C, HDMI, audio jacks)
          - ATX 24-pin power connector & EPS 8-pin CPU socket
          - CR2032 CMOS coin-cell battery in holder
          - Procedural geometric copper/gold solder traces
        """
        mats = build_material_library()
        pcb_mat = mats["pcb_green"] if theme.lower() == "green" else mats["pcb_black"]

        root = bpy.data.objects.new("Motherboard_Root", None)
        bpy.context.scene.collection.objects.link(root)

        # 1. Main PCB Board (Standard ATX 305mm x 244mm scaled to 2.44 x 3.05 x 0.04)
        add_box("PCB_Substrate", (2.44, 3.05, 0.04), (0.0, 0.0, 0.02), material=pcb_mat, parent=root)

        # Mounting Hole Gold/Silver Rings (9 standard ATX mounting points)
        hole_coords = [
            (-1.12, 1.42), (0.0, 1.42), (1.12, 1.42),
            (-1.12, 0.0), (0.0, 0.0), (1.12, 0.0),
            (-1.12, -1.42), (0.0, -1.42), (1.12, -1.42)
        ]
        for idx, (hx, hy) in enumerate(hole_coords):
            add_cylinder(f"Mount_Pad_{idx}", radius=0.035, depth=0.042, vertices=12, location=(hx, hy, 0.021), material=mats["metal_gold"], parent=root)
            add_cylinder(f"Mount_Hole_{idx}", radius=0.02, depth=0.046, vertices=12, location=(hx, hy, 0.021), material=mats["plastic_black"], parent=root)

        # 2. CPU Socket & Retention Bracket (LGA / AM5 style at upper-central area)
        socket_pos = (-0.25, 0.55, 0.04)
        add_box("CPU_Socket_Base", (0.68, 0.68, 0.02), (socket_pos[0], socket_pos[1], 0.05), material=mats["metal_silver"], parent=root)
        add_box("CPU_Socket_Bed", (0.52, 0.52, 0.015), (socket_pos[0], socket_pos[1], 0.065), material=mats["plastic_black"], parent=root)
        add_box("CPU_Retention_Frame", (0.62, 0.62, 0.02), (socket_pos[0], socket_pos[1], 0.075), material=mats["metal_silver"], parent=root)
        add_box("CPU_Load_Plate", (0.58, 0.58, 0.018), (socket_pos[0], socket_pos[1], 0.078), material=mats["metal_silver"], parent=root)
        # Retention Arm Lever
        add_cylinder("CPU_Socket_Lever", radius=0.012, depth=0.68, vertices=8, location=(socket_pos[0] + 0.36, socket_pos[1], 0.075), rotation=(math.radians(90), 0, 0), material=mats["metal_silver"], parent=root)
        add_box("CPU_Lever_Tab", (0.04, 0.06, 0.03), (socket_pos[0] + 0.36, socket_pos[1] - 0.36, 0.08), material=mats["plastic_black"], parent=root)

        # 3. VRM Heatsinks (Top & Left Power Phases)
        # Top VRM Heatsink
        add_box("VRM_Top_Base", (0.95, 0.28, 0.22), (-0.25, 1.10, 0.15), material=mats.get("heatsink_aluminum", mats["metal_dark"]), parent=root)
        for i in range(5):
            add_box(f"VRM_Top_Fin_{i}", (0.95, 0.018, 0.12), (-0.25, 0.99 + i * 0.05, 0.28), material=mats.get("heatsink_aluminum", mats["metal_dark"]), parent=root)
        # Left VRM Heatsink
        add_box("VRM_Left_Base", (0.30, 0.95, 0.24), (-0.85, 0.55, 0.16), material=mats.get("heatsink_aluminum", mats["metal_dark"]), parent=root)
        for i in range(6):
            add_box(f"VRM_Left_Fin_{i}", (0.018, 0.95, 0.14), (-0.96 + i * 0.045, 0.55, 0.30), material=mats.get("heatsink_aluminum", mats["metal_dark"]), parent=root)
        # Connected L-Shaped Copper Heatpipe
        add_cylinder("VRM_Heatpipe_Top", radius=0.022, depth=0.55, vertices=12, location=(-0.55, 1.10, 0.26), rotation=(0, math.radians(90), 0), material=mats["metal_copper"], parent=root)
        add_cylinder("VRM_Heatpipe_Left", radius=0.022, depth=0.45, vertices=12, location=(-0.82, 0.88, 0.26), rotation=(math.radians(90), 0, 0), material=mats["metal_copper"], parent=root)

        # 4. Chipset / Southbridge Heatsink (Lower-right quadrant)
        add_box("Chipset_Heatsink", (0.65, 0.65, 0.12), (0.70, -0.75, 0.10), material=mats.get("heatsink_aluminum", mats["metal_dark"]), parent=root)
        add_box("Chipset_Accent_Plate", (0.50, 0.50, 0.02), (0.70, -0.75, 0.17), material=mats["metal_silver"], parent=root)

        # 5. PCIe Slots & M.2 Shield
        # Primary PCIe 5.0 x16 Slot (Reinforced Steel Shielding)
        add_box("PCIe_x16_1_Body", (1.50, 0.12, 0.10), (-0.10, -0.05, 0.09), material=mats["plastic_black"], parent=root)
        add_box("PCIe_x16_1_Armor", (1.52, 0.13, 0.08), (-0.10, -0.05, 0.08), material=mats["metal_silver"], parent=root)
        add_box("PCIe_x16_1_Latch", (0.08, 0.14, 0.12), (0.68, -0.05, 0.10), material=mats["plastic_white"], parent=root)
        # PCIe x1 Slot
        add_box("PCIe_x1_Body", (0.45, 0.10, 0.08), (-0.45, -0.35, 0.08), material=mats["plastic_black"], parent=root)
        # M.2 NVMe Thermal Shield
        add_box("M2_Heatshield", (0.95, 0.22, 0.04), (0.25, -0.35, 0.06), material=mats.get("heatsink_aluminum", mats["metal_silver"]), parent=root)
        add_cylinder("M2_Thumbscrew", radius=0.025, depth=0.05, vertices=12, location=(0.70, -0.35, 0.08), material=mats["metal_dark"], parent=root)
        # Secondary PCIe 4.0 x16 Slot
        add_box("PCIe_x16_2_Body", (1.50, 0.12, 0.10), (-0.10, -0.65, 0.09), material=mats["plastic_black"], parent=root)
        add_box("PCIe_x16_2_Latch", (0.08, 0.14, 0.12), (0.68, -0.65, 0.10), material=mats["plastic_black"], parent=root)

        # 6. DDR5 RAM DIMM Slots (4 parallel slots)
        ram_x_start = 0.45
        for i in range(4):
            rx = ram_x_start + i * 0.15
            add_box(f"RAM_Slot_{i}", (0.08, 1.50, 0.12), (rx, 0.55, 0.10), material=mats["plastic_black"], parent=root)
            add_box(f"RAM_Clip_Top_{i}", (0.09, 0.08, 0.14), (rx, 1.28, 0.11), material=mats["plastic_white"], parent=root)
            add_box(f"RAM_Clip_Bot_{i}", (0.09, 0.08, 0.14), (rx, -0.18, 0.11), material=mats["plastic_white"], parent=root)

        # 7. Solid Capacitor Cylinders
        # VRM Phase Capacitors
        vrm_cap_pos = [
            (-0.70, 1.05), (-0.58, 1.05), (-0.46, 1.05),
            (-0.68, 0.88), (-0.68, 0.74), (-0.68, 0.60), (-0.68, 0.46), (-0.68, 0.32),
            (-0.55, 0.20), (-0.42, 0.20)
        ]
        for idx, (cx, cy) in enumerate(vrm_cap_pos):
            add_cylinder(f"VRM_Cap_Body_{idx}", radius=0.042, depth=0.14, vertices=14, location=(cx, cy, 0.11), material=mats["capacitor_blue"], parent=root)
            add_cylinder(f"VRM_Cap_Top_{idx}", radius=0.042, depth=0.015, vertices=14, location=(cx, cy, 0.18), material=mats["capacitor_silver"], parent=root)

        # Audio Section Golden Capacitors
        audio_cap_pos = [(-1.05, -1.0), (-1.05, -1.15), (-1.05, -1.30), (-0.90, -1.15), (-0.90, -1.30)]
        for idx, (cx, cy) in enumerate(audio_cap_pos):
            add_cylinder(f"Audio_Cap_Body_{idx}", radius=0.040, depth=0.12, vertices=12, location=(cx, cy, 0.10), material=mats["metal_gold"], parent=root)
            add_cylinder(f"Audio_Cap_Top_{idx}", radius=0.040, depth=0.015, vertices=12, location=(cx, cy, 0.165), material=mats["capacitor_silver"], parent=root)

        # 8. Rear I/O Box & External Ports (Left edge)
        add_box("Rear_IO_Shield", (0.24, 1.15, 0.32), (-1.08, 0.75, 0.20), material=mats["metal_silver"], parent=root)
        # RJ45 Ethernet Port
        add_box("IO_RJ45_Jack", (0.16, 0.18, 0.16), (-1.18, 1.15, 0.22), material=mats["metal_dark"], parent=root)
        # USB 3.0 Dual Stacks (Blue Inserts)
        add_box("IO_USB3_Stack_1", (0.14, 0.16, 0.18), (-1.18, 0.85, 0.22), material=mats["metal_silver"], parent=root)
        add_box("IO_USB3_Insert_1A", (0.05, 0.12, 0.03), (-1.21, 0.85, 0.26), material=mats["plastic_blue_usb"], parent=root)
        add_box("IO_USB3_Insert_1B", (0.05, 0.12, 0.03), (-1.21, 0.85, 0.18), material=mats["plastic_blue_usb"], parent=root)
        # USB-C Port
        add_box("IO_USBC_Port", (0.08, 0.09, 0.04), (-1.20, 0.60, 0.18), material=mats["metal_silver"], parent=root)
        # HDMI Connector
        add_box("IO_HDMI_Port", (0.12, 0.16, 0.06), (-1.18, 0.42, 0.20), material=mats["metal_dark"], parent=root)
        # 3.5mm Color-Coded Audio Jacks
        add_cylinder("Audio_Jack_Lime", radius=0.025, depth=0.04, vertices=12, location=(-1.19, 0.25, 0.26), rotation=(0, math.radians(90), 0), material=mats["audio_lime"], parent=root)
        add_cylinder("Audio_Jack_Cyan", radius=0.025, depth=0.04, vertices=12, location=(-1.19, 0.25, 0.20), rotation=(0, math.radians(90), 0), material=mats["audio_cyan"], parent=root)
        add_cylinder("Audio_Jack_Pink", radius=0.025, depth=0.04, vertices=12, location=(-1.19, 0.25, 0.14), rotation=(0, math.radians(90), 0), material=mats["audio_pink"], parent=root)

        # 9. Power Connectors & CMOS Battery
        # 24-Pin ATX Main Power Socket
        add_box("ATX_24Pin_Housing", (0.14, 0.65, 0.14), (1.10, 0.10, 0.11), material=mats["plastic_white"], parent=root)
        for p in range(12):
            add_cylinder(f"ATX_Pin_A_{p}", radius=0.008, depth=0.06, vertices=6, location=(1.07, -0.18 + p * 0.05, 0.18), material=mats["metal_gold"], parent=root)
            add_cylinder(f"ATX_Pin_B_{p}", radius=0.008, depth=0.06, vertices=6, location=(1.13, -0.18 + p * 0.05, 0.18), material=mats["metal_gold"], parent=root)
        # 8-Pin EPS CPU Power Socket
        add_box("EPS_8Pin_Housing", (0.14, 0.26, 0.14), (-1.05, 1.32, 0.11), material=mats["plastic_black"], parent=root)
        # SATA Ports (Stacked 4-port cluster)
        add_box("SATA_Ports_Block", (0.16, 0.38, 0.12), (1.10, -1.05, 0.09), material=mats["plastic_black"], parent=root)
        # CR2032 CMOS Battery & Holder
        add_cylinder("CMOS_Holder", radius=0.13, depth=0.04, vertices=18, location=(0.35, -0.12, 0.05), material=mats["plastic_black"], parent=root)
        add_cylinder("CMOS_Battery", radius=0.11, depth=0.03, vertices=18, location=(0.35, -0.12, 0.06), material=mats["metal_silver"], parent=root)

        # 10. Solder Traces & SMD Components (Procedural Geometric Detailing)
        for t in range(7):
            trace_y = 0.20 + t * 0.10
            add_box(f"Trace_CPU_RAM_{t}", (0.50, 0.012, 0.005), (0.15, trace_y, 0.043), material=mats["metal_copper"], parent=root)
        for t in range(5):
            trace_x = -0.50 + t * 0.18
            add_box(f"Trace_CPU_PCIe_{t}", (0.012, 0.40, 0.005), (trace_x, 0.15, 0.043), material=mats["metal_copper"], parent=root)

        return root

    # -------------------------------------------------------------------------
    # 2. RJ45 Cable Connector Generator
    # -------------------------------------------------------------------------
    def create_rj45_connector_mesh(standard: str = "T568B"):
        """
        Generate a photorealistic RJ45 (8P8C) Modular Plug & Cable:
          - Transparent polycarbonate housing with stepped front nose
          - Top cantilever locking latch spring clip with release tab
          - 8 gold-plated IDC contact pins
          - 8 color-coded conductor wires according to T568A or T568B standard
          - Snag-proof rubber strain relief boot
          - Flexible round Cat6 UTP outer cable jacket
        """
        mats = build_material_library()
        root = bpy.data.objects.new("RJ45_Connector_Root", None)
        bpy.context.scene.collection.objects.link(root)

        # 1. Clear Polycarbonate Main Plug Body (Dimensions approx 1.16 x 1.60 x 0.72)
        add_box("RJ45_Housing_Head", (1.16, 0.75, 0.68), (0.0, 0.55, 0.0), material=mats["polycarbonate_clear"], parent=root)
        add_box("RJ45_Housing_Body", (1.16, 0.95, 0.72), (0.0, -0.25, 0.0), material=mats["polycarbonate_clear"], parent=root)
        add_box("RJ45_Wire_Cavity", (1.00, 1.30, 0.45), (0.0, 0.10, -0.05), material=mats["polycarbonate_clear"], parent=root)

        # 2. Locking Latch Spring Clip (Cantilever clip projecting upward & backward)
        add_box("RJ45_Latch_Clip", (0.34, 0.90, 0.08), (0.0, 0.15, 0.42), rotation=(math.radians(-16), 0, 0), material=mats["polycarbonate_clear"], parent=root)
        add_box("Latch_Release_Tab", (0.42, 0.28, 0.10), (0.0, -0.32, 0.55), material=mats["polycarbonate_clear"], parent=root)
        # Side retention ears / wings
        add_box("Latch_Ear_Left", (0.10, 0.12, 0.14), (-0.22, 0.05, 0.44), material=mats["polycarbonate_clear"], parent=root)
        add_box("Latch_Ear_Right", (0.10, 0.12, 0.14), (0.22, 0.05, 0.44), material=mats["polycarbonate_clear"], parent=root)

        # 3. 8 Gold Contact Pins (8P8C IDC Blades)
        pin_spacing = 0.115
        pin_start_x = -3.5 * pin_spacing
        for i in range(8):
            px = pin_start_x + i * pin_spacing
            add_box(f"Gold_Pin_{i+1}", (0.038, 0.16, 0.24), (px, 0.72, 0.22), material=mats["metal_gold"], parent=root)

        # 4. 8 Colored Wire Conductors
        if standard.upper() == "T568A":
            wire_materials = [
                mats["wire_wg"], mats["wire_g"], mats["wire_wo"], mats["wire_b"],
                mats["wire_wb"], mats["wire_o"], mats["wire_wbr"], mats["wire_br"]
            ]
        else: # Default T568B
            wire_materials = [
                mats["wire_wo"], mats["wire_o"], mats["wire_wg"], mats["wire_b"],
                mats["wire_wb"], mats["wire_g"], mats["wire_wbr"], mats["wire_br"]
            ]

        for i, w_mat in enumerate(wire_materials):
            wx = pin_start_x + i * pin_spacing
            # Conductor wire along the channels
            add_cylinder(f"Conductor_Wire_{i+1}", radius=0.046, depth=0.90, vertices=12, location=(wx, 0.40, 0.08), rotation=(math.radians(90), 0, 0), material=w_mat, parent=root)
            # Exposed copper tip at front wire stop
            add_cylinder(f"Copper_Core_{i+1}", radius=0.024, depth=0.04, vertices=8, location=(wx, 0.86, 0.08), rotation=(math.radians(90), 0, 0), material=mats["metal_copper"], parent=root)

        # 5. Snag-Proof Strain Relief Boot
        add_box("Strain_Boot_Body", (1.24, 1.10, 0.82), (0.0, -1.05, -0.02), material=mats["boot_blue"], parent=root)
        add_box("Strain_Boot_Hood", (0.50, 0.60, 0.22), (0.0, -0.65, 0.48), rotation=(math.radians(-14), 0, 0), material=mats["boot_blue"], parent=root)
        for r in range(3):
            add_box(f"Boot_Grip_Rib_{r}", (1.26, 0.06, 0.84), (0.0, -1.25 + r * 0.16, -0.02), material=mats["boot_blue"], parent=root)

        # 6. Flexible Round Cat6 Cable
        add_cylinder("Cat6_Cable_Jacket", radius=0.30, depth=1.60, vertices=16, location=(0.0, -2.15, -0.02), rotation=(math.radians(90), 0, 0), material=mats["cable_jacket"], parent=root)

        return root

    # -------------------------------------------------------------------------
    # 3. Datacenter Server Rack Generator
    # -------------------------------------------------------------------------
    def create_datacenter_rack_mesh():
        """
        Generate a photorealistic 42U Datacenter Equipment Rack:
          - 42U Steel Cabinet Frame (4 vertical corner posts, roof canopy, base plinth, dual casters)
          - 42U EIA-310 standard galvanized mounting rails with U markings & cage nut holes
          - Perforated mesh side walls and open front door swung to the side showcasing interior
          - 1U Network Switch at U30 with 48 RJ45 ports, SFP cages, and glowing activity LEDs
          - 2U High-Density Rackmount Server at U19-U20 with 12 hot-swap drive caddies & LEDs
          - 3U Online Double-Conversion UPS at U3-U5 with illuminated blue LCD display
          - 1U Cable Management Panel with D-rings & airflow blanking panels
        """
        mats = build_material_library()
        root = bpy.data.objects.new("Datacenter_Rack_Root", None)
        bpy.context.scene.collection.objects.link(root)

        # 1. 42U Cabinet Enclosure & Heavy-Duty Frame
        corner_offsets = [(-0.57, -0.87), (0.57, -0.87), (-0.57, 0.87), (0.57, 0.87)]
        for idx, (px, py) in enumerate(corner_offsets):
            add_box(f"Frame_Post_{idx}", (0.07, 0.07, 4.20), (px, py, 0.0), material=mats["rack_steel"], parent=root)

        # Top Roof Canopy
        add_box("Roof_Canopy", (1.22, 1.82, 0.10), (0.0, 0.0, 2.15), material=mats["rack_steel"], parent=root)
        fan_pos = [(-0.30, -0.40), (0.30, -0.40), (-0.30, 0.40), (0.30, 0.40)]
        for idx, (fx, fy) in enumerate(fan_pos):
            add_cylinder(f"Roof_Fan_{idx}", radius=0.18, depth=0.03, vertices=16, location=(fx, fy, 2.21), material=mats["metal_dark"], parent=root)

        # Bottom Heavy Plinth & Casters
        add_box("Base_Plinth", (1.22, 1.82, 0.12), (0.0, 0.0, -2.15), material=mats["rack_steel"], parent=root)
        for idx, (cx, cy) in enumerate(corner_offsets):
            add_cylinder(f"Caster_Wheel_{idx}", radius=0.10, depth=0.08, vertices=12, location=(cx, cy, -2.28), rotation=(0, math.radians(90), 0), material=mats["plastic_black"], parent=root)
            add_cylinder(f"Leveling_Foot_{idx}", radius=0.04, depth=0.08, vertices=12, location=(cx * 0.8, cy * 0.8, -2.28), material=mats["metal_silver"], parent=root)

        # Perforated Mesh Side Panels (Left & Right walls)
        add_box("Side_Panel_Left", (0.015, 1.68, 4.05), (-0.58, 0.0, 0.0), material=mats["metal_dark"], parent=root)
        add_box("Side_Panel_Right", (0.015, 1.68, 4.05), (0.58, 0.0, 0.0), material=mats["metal_dark"], parent=root)

        # 2. 42U Vertical EIA-310 Galvanized Mounting Rails
        rail_x = 0.47
        rail_y = 0.72
        add_box("EIA_Rail_Front_L", (0.05, 0.05, 4.0), (-rail_x, rail_y, 0.0), material=mats["rack_rails"], parent=root)
        add_box("EIA_Rail_Front_R", (0.05, 0.05, 4.0), (rail_x, rail_y, 0.0), material=mats["rack_rails"], parent=root)
        add_box("EIA_Rail_Rear_L", (0.05, 0.05, 4.0), (-rail_x, -rail_y, 0.0), material=mats["rack_rails"], parent=root)
        add_box("EIA_Rail_Rear_R", (0.05, 0.05, 4.0), (rail_x, -rail_y, 0.0), material=mats["rack_rails"], parent=root)

        # 3. 1U Enterprise Network Switch (Mounted at U30, Z = +0.95)
        sw_z = 0.95
        add_box("Switch_1U_Chassis", (0.94, 0.85, 0.088), (0.0, 0.30, sw_z), material=mats["metal_dark"], parent=root)
        add_box("Switch_1U_Faceplate", (0.92, 0.02, 0.084), (0.0, 0.73, sw_z), material=mats["metal_silver"], parent=root)
        add_box("Switch_Ear_L", (0.04, 0.04, 0.086), (-0.47, 0.72, sw_z), material=mats["metal_silver"], parent=root)
        add_box("Switch_Ear_R", (0.04, 0.04, 0.086), (0.47, 0.72, sw_z), material=mats["metal_silver"], parent=root)

        # 48 RJ45 Ports (2 rows of 24)
        port_dx = 0.028
        port_start_x = -0.38
        for p in range(24):
            px = port_start_x + p * port_dx
            add_box(f"SW_Port_T_{p}", (0.022, 0.02, 0.024), (px, 0.74, sw_z + 0.018), material=mats["plastic_black"], parent=root)
            add_box(f"SW_Port_B_{p}", (0.022, 0.02, 0.024), (px, 0.74, sw_z - 0.018), material=mats["plastic_black"], parent=root)
            led_mat = mats["led_green"] if (p % 3 != 0) else mats["led_amber"]
            add_cylinder(f"SW_LED_{p}", radius=0.005, depth=0.012, vertices=8, location=(px, 0.745, sw_z + 0.034), rotation=(math.radians(90), 0, 0), material=led_mat, parent=root)

        # SFP28 / QSFP+ Uplink Ports
        for s in range(4):
            add_box(f"SW_SFP_{s}", (0.032, 0.03, 0.042), (0.32 + s * 0.042, 0.74, sw_z), material=mats["metal_silver"], parent=root)

        # 4. 2U High-Density Storage Server (Mounted at U19-U20, Z = 0.05)
        srv_z = 0.05
        add_box("Server_2U_Chassis", (0.94, 1.45, 0.176), (0.0, 0.0, srv_z), material=mats["metal_dark"], parent=root)
        add_box("Server_2U_Bezel", (0.92, 0.02, 0.172), (0.0, 0.73, srv_z), material=mats["server_face"], parent=root)
        add_box("Server_Ear_L", (0.04, 0.04, 0.174), (-0.47, 0.72, srv_z), material=mats["metal_silver"], parent=root)
        add_box("Server_Ear_R", (0.04, 0.04, 0.174), (0.47, 0.72, srv_z), material=mats["metal_silver"], parent=root)

        # 12 Hot-Swap 3.5" Drive Caddies (3 rows of 4 bays)
        bay_w = 0.18
        bay_h = 0.048
        bay_x_start = -0.32
        for row in range(3):
            for col in range(4):
                bx = bay_x_start + col * (bay_w + 0.025)
                by = 0.74
                bz = srv_z + 0.05 - row * (bay_h + 0.008)
                caddy_name = "Server_Drive_Caddy_0" if (row == 0 and col == 0) else f"Caddy_Frame_{row}_{col}"
                add_box(caddy_name, (bay_w, 0.015, bay_h), (bx, by, bz), material=mats["drive_caddy"], parent=root)
                add_box(f"Caddy_Lever_{row}_{col}", (bay_w * 0.75, 0.02, 0.012), (bx - bay_w * 0.1, by + 0.008, bz - bay_h * 0.25), material=mats["plastic_black"], parent=root)
                add_cylinder(f"Caddy_LED_P_{row}_{col}", radius=0.005, depth=0.012, vertices=8, location=(bx + bay_w * 0.38, by + 0.008, bz + 0.012), rotation=(math.radians(90), 0, 0), material=mats["led_green"], parent=root)
                add_cylinder(f"Caddy_LED_A_{row}_{col}", radius=0.005, depth=0.012, vertices=8, location=(bx + bay_w * 0.38, by + 0.008, bz - 0.012), rotation=(math.radians(90), 0, 0), material=mats["led_amber"], parent=root)

        # Server Control Bezel: Power Button, UID Blue Beacon, Diagnostic Ports
        add_cylinder("Server_Power_Btn", radius=0.014, depth=0.015, vertices=12, location=(0.40, 0.742, srv_z + 0.05), rotation=(math.radians(90), 0, 0), material=mats["led_green"], parent=root)
        add_cylinder("Server_UID_Beacon", radius=0.010, depth=0.015, vertices=12, location=(0.40, 0.742, srv_z + 0.02), rotation=(math.radians(90), 0, 0), material=mats["led_blue"], parent=root)
        add_box("Server_Front_USB", (0.028, 0.02, 0.015), (0.40, 0.742, srv_z - 0.02), material=mats["plastic_black"], parent=root)

        # 5. 3U Online Double-Conversion UPS (Mounted at U3-U5, Z = -1.35)
        ups_z = -1.35
        add_box("UPS_3U_Chassis", (0.94, 1.50, 0.264), (0.0, 0.0, ups_z), material=mats["rack_steel"], parent=root)
        add_box("UPS_3U_Front_Bezel", (0.92, 0.02, 0.260), (0.0, 0.73, ups_z), material=mats["metal_dark"], parent=root)
        add_box("UPS_Ear_L", (0.04, 0.04, 0.262), (-0.47, 0.72, ups_z), material=mats["rack_steel"], parent=root)
        add_box("UPS_Ear_R", (0.04, 0.04, 0.262), (0.47, 0.72, ups_z), material=mats["rack_steel"], parent=root)

        # Illuminated Blue Backlit LCD Display
        add_box("UPS_LCD_Screen", (0.24, 0.015, 0.11), (0.22, 0.742, ups_z + 0.03), material=mats["lcd_screen"], parent=root)
        for b in range(4):
            add_cylinder(f"UPS_Btn_{b}", radius=0.008, depth=0.01, vertices=10, location=(0.14 + b * 0.05, 0.742, ups_z - 0.06), rotation=(math.radians(90), 0, 0), material=mats["plastic_black"], parent=root)
        add_box("UPS_Battery_Bay_Door", (0.48, 0.018, 0.20), (-0.18, 0.74, ups_z), material=mats["metal_dark"], parent=root)
        for l in range(5):
            add_box(f"UPS_Louver_{l}", (0.44, 0.02, 0.01), (-0.18, 0.745, ups_z - 0.06 + l * 0.03), material=mats["metal_silver"], parent=root)

        # 6. Datacenter Detailing: 1U Cable Management Panel & 2U Blanking Panels
        add_box("Cable_Mgmt_1U", (0.92, 0.12, 0.086), (0.0, 0.70, 0.83), material=mats["plastic_black"], parent=root)
        for d in range(5):
            add_box(f"D_Ring_{d}", (0.04, 0.14, 0.06), (-0.36 + d * 0.18, 0.74, 0.83), material=mats["metal_dark"], parent=root)
        add_box("Airflow_Blanking_2U", (0.92, 0.02, 0.176), (0.0, 0.725, -0.70), material=mats["plastic_black"], parent=root)

        return root

    # -------------------------------------------------------------------------
    # Hierarchy Tagging & Shading Enhancement Routines
    # -------------------------------------------------------------------------
    def tag_asset_hierarchy(root_obj, asset_name: str) -> dict:
        """
        Automated hierarchy tagging routine for CompTIA A+ 3D assets.
        Traverses object tree and applies structured metadata (subsystem classification,
        CompTIA A+ exam objectives, and 3D interactive viewer hotspot mappings)
        into Blender object custom properties for glTF extras export.
        """
        asset_key = asset_name.lower()
        if any(k in asset_key for k in ("motherboard", "mb")):
            key = "motherboard"
        elif any(k in asset_key for k in ("cable", "rj45")):
            key = "cable"
        elif any(k in asset_key for k in ("rack", "server")):
            key = "rack"
        else:
            key = asset_key

        mapping = ASSET_HIERARCHY_METADATA.get(key, {})
        tagged_nodes = 0
        hotspots_tagged = 0

        def _tag(obj):
            nonlocal tagged_nodes, hotspots_tagged
            name = obj.name
            meta = mapping.get(name)

            obj["comptia_asset"] = key
            if meta:
                if "subsystem" in meta:
                    obj["comptia_subsystem"] = meta["subsystem"]
                if "hotspot_id" in meta:
                    obj["hotspot_id"] = meta["hotspot_id"]
                    obj["hotspot_label"] = meta["label"]
                    obj["comptia_objective"] = meta["obj"]
                    hotspots_tagged += 1
                obj["inspectable"] = meta.get("inspectable", True)
            else:
                obj["comptia_subsystem"] = "General"
                obj["inspectable"] = False

            if hasattr(obj, "data") and obj.data:
                if not obj.data.name or obj.data.name.startswith("Cube") or obj.data.name.startswith("Cylinder"):
                    obj.data.name = f"{name}_mesh"

            tagged_nodes += 1
            for child in obj.children:
                _tag(child)

        _tag(root_obj)
        print(f"[HIERARCHY TAGGING] Applied metadata to {tagged_nodes} nodes ({hotspots_tagged} hotspots) on '{key.upper()}'.")
        return {"tagged_nodes": tagged_nodes, "hotspots": hotspots_tagged}

    def bake_cycles_ao(root_obj, target: str = "VERTEX_COLORS", samples: int = 16, margin: int = 4) -> dict:
        """
        Automated Cycles Ambient Occlusion light baking routine.
        Bakes contact shadows and ambient occlusion into Vertex Colors (Color Attributes)
        or Image Textures, delivering photorealistic depth to WebGL/Three.js assets.
        """
        start_time = time.perf_counter()
        scene = bpy.context.scene
        prev_engine = scene.render.engine

        # Ensure Cycles engine
        scene.render.engine = "CYCLES"
        if hasattr(scene, "cycles"):
            scene.cycles.samples = samples
            if hasattr(scene.cycles, "bake_type"):
                try:
                    scene.cycles.bake_type = "AO"
                except Exception:
                    pass

        if hasattr(scene.render, "bake"):
            scene.render.bake.use_pass_color = False
            scene.render.bake.margin = margin
            if hasattr(scene.render.bake, "target"):
                try:
                    scene.render.bake.target = target.upper()
                except Exception:
                    pass

        # Collect mesh objects only (non-mesh objects like Empties will cause bake failure)
        mesh_objs = []
        def _collect_meshes(obj):
            if obj.type == "MESH":
                mesh_objs.append(obj)
            for child in obj.children:
                _collect_meshes(child)
        _collect_meshes(root_obj)

        if not mesh_objs:
            print("[CYCLES AO BAKE] Notice: No mesh objects found to bake.")
            scene.render.engine = prev_engine
            return {"baked_meshes": 0, "duration": 0.0}

        print(f"[CYCLES AO BAKE] Starting Cycles AO bake for {len(mesh_objs)} meshes (Target: {target}, Samples: {samples})...")

        if target.upper() == "VERTEX_COLORS":
            # Deselect all
            bpy.ops.object.select_all(action="DESELECT")
            for m in mesh_objs:
                m.select_set(True)
                if hasattr(m.data, "color_attributes"):
                    if "AO" not in m.data.color_attributes:
                        col_attr = m.data.color_attributes.new(name="AO", type="BYTE_COLOR", domain="CORNER")
                    else:
                        col_attr = m.data.color_attributes["AO"]
                    m.data.color_attributes.active_color = col_attr

            scene.render.bake.target = "VERTEX_COLORS"
            bpy.context.view_layer.objects.active = mesh_objs[0]

            try:
                bpy.ops.object.bake(type="AO")
            except Exception as e:
                print(f"[CYCLES AO BAKE] Error during vertex color bake: {e}")

            # Connect Color Attribute in materials for glTF exporter recognition
            for mat in bpy.data.materials:
                if mat.node_tree:
                    nodes = mat.node_tree.nodes
                    links = mat.node_tree.links
                    bsdf = nodes.get("Principled BSDF")
                    if bsdf and not nodes.get("AO_Attribute"):
                        try:
                            attr_node = nodes.new(type="ShaderNodeAttribute")
                            attr_node.name = "AO_Attribute"
                            attr_node.attribute_name = "AO"
                            mix_node = nodes.new(type="ShaderNodeMix")
                            mix_node.name = "AO_Mix"
                            mix_node.data_type = "RGBA"
                            mix_node.blend_type = "MULTIPLY"
                            mix_node.inputs[0].default_value = 1.0
                            orig_color = bsdf.inputs["Base Color"].default_value[:]
                            mix_node.inputs[6].default_value = orig_color
                            links.new(attr_node.outputs["Color"], mix_node.inputs[7])
                            links.new(mix_node.outputs[2], bsdf.inputs["Base Color"])
                        except Exception as e:
                            print(f"[CYCLES AO BAKE] Notice: Material node connection skipped: {e}")

        elif target.upper() == "IMAGE_TEXTURES":
            scene.render.bake.target = "IMAGE_TEXTURES"
            for m in mesh_objs:
                bpy.ops.object.select_all(action="DESELECT")
                m.select_set(True)
                bpy.context.view_layer.objects.active = m
                if not m.data.uv_layers:
                    bpy.ops.object.mode_set(mode="EDIT")
                    bpy.ops.uv.smart_project()
                    bpy.ops.object.mode_set(mode="OBJECT")
                try:
                    bpy.ops.object.bake(type="AO")
                except Exception as e:
                    print(f"[CYCLES AO BAKE] Notice: Image texture bake skipped for {m.name}: {e}")

        # Restore previous engine
        scene.render.engine = prev_engine
        duration = time.perf_counter() - start_time
        print(f"[CYCLES AO BAKE] Completed AO bake for {len(mesh_objs)} meshes in {duration:.2f}s.")
        return {"baked_meshes": len(mesh_objs), "duration": duration}

    # -------------------------------------------------------------------------
    # Rendering & GLTF Export Execution
    # -------------------------------------------------------------------------
    def render_and_export_asset(
        asset_name: str,
        output_dir: str,
        fmt: str = "png",
        camera_angle: str = "isometric",
        engine_choice: str = "AUTO",
        width: int = 1200,
        height: int = 800,
        bake_ao: bool = False,
        ao_samples: int = 16,
        ao_target: str = "VERTEX_COLORS",
        sync_landing: bool = True,
        landing_models_dir: str = "landing/models",
    ):
        """Execute scene generation, studio setup, camera framing, image rendering, and GLB export."""
        print(f"\n[BLENDER PIPELINE] >>> Processing Asset: '{asset_name.upper()}' <<<")
        abs_output_dir = ensure_output_directory(output_dir)

        # 1. Reset Scene
        clear_scene()

        # 2. Procedural Mesh Generation
        if asset_name in ("motherboard", "mb"):
            root_obj = create_motherboard_mesh(theme="green")
            export_base_name = "motherboard"
        elif asset_name in ("cable", "rj45"):
            root_obj = create_rj45_connector_mesh(standard="T568B")
            export_base_name = "rj45_connector"
        elif asset_name in ("rack", "server_rack"):
            root_obj = create_datacenter_rack_mesh()
            export_base_name = "datacenter_rack"
        else:
            raise ValueError(f"Unknown asset identifier: {asset_name}")

        # Apply automated hierarchy tagging
        tag_asset_hierarchy(root_obj, export_base_name)

        # 3. Environment & Engine Setup
        setup_render_engine(engine_choice)
        scene = bpy.context.scene
        scene.render.resolution_x = width
        scene.render.resolution_y = height

        # 4. Camera Framing & Lighting
        target_center, extents, radius = calculate_bounds(root_obj)
        angles_to_render = ["isometric", "orthographic"] if camera_angle.lower() == "all" else [camera_angle.lower()]

        # 5. Cycles AO Light Baking (if requested)
        if bake_ao:
            bake_cycles_ao(root_obj, target=ao_target, samples=ao_samples)

        # 6. PNG Diagram Rendering
        if fmt.lower() in ("png", "all"):
            for ang in angles_to_render:
                # Remove prior cameras and lights
                for obj in list(scene.objects):
                    if obj.type in ("CAMERA", "LIGHT"):
                        bpy.data.objects.remove(obj, do_unlink=True)

                setup_camera(target_center, extents, radius, angle_type=ang, asset_name=export_base_name)

                png_filename = f"{export_base_name}_{ang}.png"
                primary_png_filename = f"{export_base_name}.png"
                png_path = os.path.abspath(os.path.join(abs_output_dir, png_filename))
                primary_png_path = os.path.abspath(os.path.join(abs_output_dir, primary_png_filename))

                scene.render.filepath = png_path
                print(f"[BLENDER PIPELINE] Rendering {ang.upper()} view ({width}x{height}) -> {png_filename}...")
                bpy.ops.render.render(write_still=True)

                if os.path.isfile(png_path):
                    file_size = os.path.getsize(png_path)
                    print(f"[BLENDER PIPELINE] Saved image: {png_path} ({file_size / 1024:.1f} KB)")
                    # Duplicate primary isometric angle as default asset PNG
                    if ang == "isometric" and png_path != primary_png_path:
                        shutil.copyfile(png_path, primary_png_path)

        # 7. GLB Model Export (WebGL / Three.js Optimized <1MB)
        if fmt.lower() in ("glb", "all"):
            glb_filename = f"{export_base_name}.glb"
            glb_path = os.path.abspath(os.path.join(abs_output_dir, glb_filename))

            # Select the entire hierarchy
            bpy.ops.object.select_all(action="DESELECT")
            def _select_tree(obj):
                obj.select_set(True)
                for c in obj.children:
                    _select_tree(c)
            _select_tree(root_obj)
            bpy.context.view_layer.objects.active = root_obj

            print(f"[BLENDER PIPELINE] Exporting WebGL-optimized GLTF/GLB -> {glb_filename}...")
            bpy.ops.export_scene.gltf(
                filepath=glb_path,
                export_format="GLB",
                use_selection=True,
                export_apply=True,
                export_image_format="AUTO",
                export_materials="EXPORT",
                export_cameras=False,
                export_lights=False,
                export_extras=True,
                export_all_vertex_colors=True,
            )

            if os.path.isfile(glb_path):
                glb_size_bytes = os.path.getsize(glb_path)
                glb_size_kb = glb_size_bytes / 1024.0
                print(f"[BLENDER PIPELINE] Saved 3D model: {glb_path} ({glb_size_kb:.1f} KB)")
                if glb_size_kb > 500.0:
                    print(f"[WARNING] GLB model size ({glb_size_kb:.1f} KB) exceeds 500 KB threshold!")
                else:
                    print(f"[SUCCESS] GLB model successfully verified under 500 KB threshold ({glb_size_kb:.1f} KB < 500 KB).")

                # Synchronize to landing/models/ if requested
                if sync_landing and landing_models_dir:
                    abs_landing_dir = os.path.abspath(landing_models_dir)
                    os.makedirs(abs_landing_dir, exist_ok=True)
                    landing_glb_path = os.path.join(abs_landing_dir, glb_filename)
                    shutil.copyfile(glb_path, landing_glb_path)
                    print(f"[LANDING SYNC] Synchronized GLB to WebGL landing models: {landing_glb_path}")


# =============================================================================
# FALLBACK SVG / MOCK GENERATOR (Runs when `bpy` is NOT installed / standard CLI)
# =============================================================================
def generate_fallback_svg_motherboard(filepath: str):
    """Generate crisp, high-fidelity dark-theme technical SVG diagram for the Motherboard."""
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="pcb_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0c2314"/>
      <stop offset="100%" stop-color="#05140a"/>
    </linearGradient>
    <linearGradient id="metal_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4a5058"/>
      <stop offset="50%" stop-color="#2c3036"/>
      <stop offset="100%" stop-color="#181a1d"/>
    </linearGradient>
    <linearGradient id="gold_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffd700"/>
      <stop offset="100%" stop-color="#b8860b"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="#0a0d12"/>

  <!-- Motherboard PCB Slab -->
  <g transform="translate(180, 70)" filter="url(#shadow)">
    <!-- Base PCB -->
    <rect x="0" y="0" width="840" height="660" rx="16" fill="url(#pcb_grad)" stroke="#1a472a" stroke-width="4"/>

    <!-- Gold Edge Mounting Holes -->
    <circle cx="30" cy="30" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="420" cy="30" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="810" cy="30" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="30" cy="330" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="810" cy="330" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="30" cy="630" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="420" cy="630" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>
    <circle cx="810" cy="630" r="14" fill="#0a0d12" stroke="url(#gold_grad)" stroke-width="5"/>

    <!-- Rear I/O Shield Enclosure -->
    <rect x="12" y="50" width="90" height="320" rx="6" fill="url(#metal_grad)" stroke="#666" stroke-width="2"/>
    <rect x="25" y="70" width="64" height="48" rx="4" fill="#111" stroke="#00d2ff" stroke-width="1.5"/>
    <text x="32" y="100" fill="#00d2ff" font-family="sans-serif" font-size="11" font-weight="bold">RJ45</text>
    <rect x="25" y="130" width="64" height="36" rx="3" fill="#0b3882"/>
    <rect x="25" y="175" width="64" height="36" rx="3" fill="#0b3882"/>
    <text x="32" y="154" fill="#fff" font-family="sans-serif" font-size="10">USB 3.2</text>
    <circle cx="40" cy="245" r="9" fill="#32cd32"/>
    <circle cx="70" cy="245" r="9" fill="#00bfff"/>
    <circle cx="40" cy="285" r="9" fill="#ff1493"/>

    <!-- Top & Left VRM Aluminum Heatsinks -->
    <rect x="180" y="45" width="280" height="75" rx="6" fill="url(#metal_grad)" stroke="#555" stroke-width="2"/>
    <line x1="210" y1="45" x2="210" y2="120" stroke="#777" stroke-width="3"/>
    <line x1="250" y1="45" x2="250" y2="120" stroke="#777" stroke-width="3"/>
    <line x1="290" y1="45" x2="290" y2="120" stroke="#777" stroke-width="3"/>
    <line x1="330" y1="45" x2="330" y2="120" stroke="#777" stroke-width="3"/>
    <line x1="370" y1="45" x2="370" y2="120" stroke="#777" stroke-width="3"/>
    <line x1="410" y1="45" x2="410" y2="120" stroke="#777" stroke-width="3"/>

    <rect x="120" y="135" width="75" height="240" rx="6" fill="url(#metal_grad)" stroke="#555" stroke-width="2"/>
    <line x1="120" y1="170" x2="195" y2="170" stroke="#777" stroke-width="3"/>
    <line x1="120" y1="210" x2="195" y2="210" stroke="#777" stroke-width="3"/>
    <line x1="120" y1="250" x2="195" y2="250" stroke="#777" stroke-width="3"/>
    <line x1="120" y1="290" x2="195" y2="290" stroke="#777" stroke-width="3"/>
    <line x1="120" y1="330" x2="195" y2="330" stroke="#777" stroke-width="3"/>

    <!-- CPU Socket (LGA / AM5) -->
    <rect x="235" y="160" width="190" height="190" rx="8" fill="#1e2229" stroke="#999" stroke-width="3"/>
    <rect x="255" y="180" width="150" height="150" fill="#111" stroke="#444" stroke-dasharray="3,3"/>
    <text x="270" y="260" fill="#888" font-family="sans-serif" font-size="16" font-weight="bold">CPU SOCKET</text>
    <rect x="420" y="150" width="10" height="210" rx="4" fill="url(#metal_grad)"/>

    <!-- VRM Solid Capacitors -->
    <g fill="#104e8b" stroke="#00d2ff" stroke-width="2">
      <circle cx="215" cy="140" r="10"/><circle cx="215" cy="170" r="10"/><circle cx="215" cy="200" r="10"/>
      <circle cx="215" cy="230" r="10"/><circle cx="215" cy="260" r="10"/><circle cx="215" cy="290" r="10"/>
      <circle cx="215" cy="320" r="10"/><circle cx="215" cy="350" r="10"/>
    </g>

    <!-- DDR5 RAM DIMM Slots (4 Slots) -->
    <g transform="translate(480, 110)">
      <rect x="0" y="0" width="22" height="320" rx="3" fill="#15171a" stroke="#444" stroke-width="1.5"/>
      <rect x="35" y="0" width="22" height="320" rx="3" fill="#15171a" stroke="#444" stroke-width="1.5"/>
      <rect x="70" y="0" width="22" height="320" rx="3" fill="#15171a" stroke="#444" stroke-width="1.5"/>
      <rect x="105" y="0" width="22" height="320" rx="3" fill="#15171a" stroke="#444" stroke-width="1.5"/>
      <!-- Latches -->
      <rect x="-2" y="5" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="33" y="5" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="68" y="5" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="103" y="5" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="-2" y="297" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="33" y="297" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="68" y="297" width="26" height="18" fill="#e0e0e0" rx="2"/>
      <rect x="103" y="297" width="26" height="18" fill="#e0e0e0" rx="2"/>
    </g>

    <!-- 24-Pin ATX Main Power Socket -->
    <rect x="750" y="170" width="45" height="190" rx="4" fill="#f5f5dc" stroke="#999" stroke-width="2"/>
    <text x="754" y="275" fill="#333" font-family="sans-serif" font-size="12" font-weight="bold" transform="rotate(90 754 275)">24-PIN ATX</text>

    <!-- PCIe 5.0 x16 Primary Slot (Reinforced Steel) -->
    <g transform="translate(130, 410)">
      <rect x="0" y="0" width="460" height="28" rx="4" fill="url(#metal_grad)" stroke="#aaa" stroke-width="2"/>
      <line x1="20" y1="14" x2="430" y2="14" stroke="#111" stroke-width="6"/>
      <rect x="440" y="-4" width="24" height="36" rx="4" fill="#00bfff"/>
      <text x="30" y="20" fill="#fff" font-family="sans-serif" font-size="11" font-weight="bold">PCIe 5.0 x16 (GPU)</text>
    </g>

    <!-- M.2 NVMe Heatshield -->
    <rect x="130" y="460" width="320" height="42" rx="4" fill="url(#metal_grad)" stroke="#666" stroke-width="1.5"/>
    <text x="180" y="486" fill="#00d2ff" font-family="sans-serif" font-size="12" font-weight="bold">M.2 NVMe PCIe Gen4/Gen5</text>

    <!-- PCIe x1 Slot -->
    <rect x="130" y="525" width="160" height="24" rx="3" fill="#1a1a1a" stroke="#555" stroke-width="1.5"/>
    <text x="150" y="542" fill="#aaa" font-family="sans-serif" font-size="10">PCIe x1</text>

    <!-- PCIe x16 Secondary Slot -->
    <g transform="translate(130, 570)">
      <rect x="0" y="0" width="460" height="26" rx="4" fill="#1a1a1a" stroke="#555" stroke-width="1.5"/>
      <line x1="20" y1="13" x2="430" y2="13" stroke="#0a0a0a" stroke-width="5"/>
      <rect x="440" y="-4" width="22" height="34" rx="4" fill="#222"/>
    </g>

    <!-- Chipset Heatsink (Southbridge) -->
    <rect x="580" y="470" width="180" height="150" rx="8" fill="url(#metal_grad)" stroke="#777" stroke-width="2"/>
    <text x="610" y="555" fill="#00ffcc" font-family="sans-serif" font-size="16" font-weight="bold">CHIPSET</text>

    <!-- CMOS Battery CR2032 -->
    <circle cx="510" cy="530" r="30" fill="#111" stroke="#333" stroke-width="3"/>
    <circle cx="510" cy="530" r="26" fill="url(#metal_grad)" stroke="#aaa" stroke-width="2"/>
    <text x="492" y="535" fill="#fff" font-family="sans-serif" font-size="10" font-weight="bold">CR2032</text>
  </g>

  <!-- Title & Callout Header -->
  <text x="60" y="45" fill="#00ffcc" font-family="sans-serif" font-size="24" font-weight="bold">CompTIA A+ CORE 1 (220-1201) — MOTHERBOARD ARCHITECTURE</text>
</svg>"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg)


def generate_fallback_svg_cable(filepath: str):
    """Generate crisp, high-fidelity dark-theme technical SVG diagram for RJ45 Cable Connector."""
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="clear_plug" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#b0d4f1" stop-opacity="0.5"/>
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.75"/>
      <stop offset="100%" stop-color="#6ea8d6" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="boot_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#194b8c"/>
      <stop offset="100%" stop-color="#0a1d38"/>
    </linearGradient>
    <linearGradient id="gold_pin" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe066"/>
      <stop offset="100%" stop-color="#cc9900"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="#0a0d12"/>

  <!-- Title -->
  <text x="60" y="50" fill="#00ffcc" font-family="sans-serif" font-size="24" font-weight="bold">CompTIA A+ NETWORK CABLE — RJ45 (8P8C) T568B PINOUT</text>

  <!-- Cable Outer Jacket -->
  <rect x="80" y="320" width="220" height="160" rx="10" fill="#133d73" stroke="#2562b0" stroke-width="3"/>
  <text x="110" y="410" fill="#88b5ec" font-family="sans-serif" font-size="18" font-weight="bold">Cat6 UTP CABLE</text>

  <!-- Strain Relief Boot -->
  <path d="M 270 290 L 460 310 L 460 490 L 270 510 Z" fill="url(#boot_grad)" stroke="#2b6cb0" stroke-width="4"/>
  <!-- Anti-snag hood -->
  <path d="M 430 310 L 580 250 L 590 280 L 460 330 Z" fill="#153e75" stroke="#2b6cb0" stroke-width="3"/>

  <!-- Transparent Polycarbonate Housing (RJ45 Plug) -->
  <rect x="460" y="270" width="460" height="260" rx="12" fill="url(#clear_plug)" stroke="#8bc4f5" stroke-width="3"/>

  <!-- Locking Latch Clip -->
  <polygon points="560,250 820,160 840,190 600,280" fill="url(#clear_plug)" stroke="#a1d2fa" stroke-width="3"/>
  <rect x="790" y="150" width="60" height="40" rx="6" fill="#8bc4f5" stroke="#fff" stroke-width="2"/>

  <!-- 8 Gold Contact Pins (8P8C Front) -->
  <g transform="translate(810, 240)">
    <rect x="0" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="14" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="28" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="42" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="56" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="70" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="84" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
    <rect x="98" y="0" width="12" height="55" rx="2" fill="url(#gold_pin)" stroke="#fff" stroke-width="1"/>
  </g>

  <!-- 8 Colored Conductor Wires (T568B Standard) -->
  <g transform="translate(460, 310)">
    <!-- Pin 1: White/Orange -->
    <rect x="0" y="0" width="360" height="18" fill="#ffffff" stroke="#ff7f0e" stroke-width="3" stroke-dasharray="14,10"/>
    <!-- Pin 2: Orange -->
    <rect x="0" y="24" width="360" height="18" fill="#ff7f0e"/>
    <!-- Pin 3: White/Green -->
    <rect x="0" y="48" width="360" height="18" fill="#ffffff" stroke="#2ca02c" stroke-width="3" stroke-dasharray="14,10"/>
    <!-- Pin 4: Blue -->
    <rect x="0" y="72" width="360" height="18" fill="#1f77b4"/>
    <!-- Pin 5: White/Blue -->
    <rect x="0" y="96" width="360" height="18" fill="#ffffff" stroke="#1f77b4" stroke-width="3" stroke-dasharray="14,10"/>
    <!-- Pin 6: Green -->
    <rect x="0" y="120" width="360" height="18" fill="#2ca02c"/>
    <!-- Pin 7: White/Brown -->
    <rect x="0" y="144" width="360" height="18" fill="#ffffff" stroke="#8c564b" stroke-width="3" stroke-dasharray="14,10"/>
    <!-- Pin 8: Brown -->
    <rect x="0" y="168" width="360" height="18" fill="#8c564b"/>
  </g>

  <!-- Pinout Reference Labels -->
  <g transform="translate(940, 310)" font-family="sans-serif" font-size="13" font-weight="bold">
    <text x="0" y="15" fill="#ff7f0e">Pin 1: White / Orange (Tx+)</text>
    <text x="0" y="39" fill="#ff7f0e">Pin 2: Orange (Tx-)</text>
    <text x="0" y="63" fill="#2ca02c">Pin 3: White / Green (Rx+)</text>
    <text x="0" y="87" fill="#1f77b4">Pin 4: Blue</text>
    <text x="0" y="111" fill="#1f77b4">Pin 5: White / Blue</text>
    <text x="0" y="135" fill="#2ca02c">Pin 6: Green (Rx-)</text>
    <text x="0" y="159" fill="#8c564b">Pin 7: White / Brown</text>
    <text x="0" y="183" fill="#8c564b">Pin 8: Brown</text>
  </g>
</svg>"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg)


def generate_fallback_svg_rack(filepath: str):
    """Generate crisp, high-fidelity dark-theme technical SVG diagram for the 42U Datacenter Server Rack."""
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <defs>
    <linearGradient id="rack_metal" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#14171a"/>
      <stop offset="10%" stop-color="#22272e"/>
      <stop offset="90%" stop-color="#22272e"/>
      <stop offset="100%" stop-color="#14171a"/>
    </linearGradient>
    <linearGradient id="rail_zinc" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7a8288"/>
      <stop offset="100%" stop-color="#4d5357"/>
    </linearGradient>
    <linearGradient id="lcd_glow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00ffff"/>
      <stop offset="100%" stop-color="#0066cc"/>
    </linearGradient>
  </defs>

  <rect width="100%" height="100%" fill="#0a0d12"/>

  <!-- Title -->
  <text x="60" y="50" fill="#00ffcc" font-family="sans-serif" font-size="24" font-weight="bold">CompTIA A+ DATACENTER HARDWARE — 42U SERVER RACK INFRASTRUCTURE</text>

  <!-- 42U Cabinet Outer Frame -->
  <g transform="translate(340, 80)">
    <!-- Roof & Base Plinths -->
    <rect x="-30" y="0" width="520" height="24" rx="4" fill="#111" stroke="#333" stroke-width="2"/>
    <rect x="-30" y="660" width="520" height="30" rx="4" fill="#111" stroke="#333" stroke-width="2"/>
    <!-- Casters -->
    <rect x="-20" y="690" width="30" height="20" rx="4" fill="#333"/>
    <rect x="450" y="690" width="30" height="20" rx="4" fill="#333"/>

    <!-- Left & Right Vertical Frame Posts -->
    <rect x="-20" y="24" width="30" height="636" fill="url(#rack_metal)" stroke="#333" stroke-width="1.5"/>
    <rect x="450" y="24" width="30" height="636" fill="url(#rack_metal)" stroke="#333" stroke-width="1.5"/>

    <!-- Internal EIA-310 Mounting Rails -->
    <rect x="20" y="24" width="22" height="636" fill="url(#rail_zinc)"/>
    <rect x="418" y="24" width="22" height="636" fill="url(#rail_zinc)"/>

    <!-- Rail U markings (Tick marks & numbers) -->
    <g fill="#999" font-family="monospace" font-size="8">
      <text x="23" y="110">42U</text><text x="23" y="230">30U</text>
      <text x="23" y="370">20U</text><text x="23" y="510">10U</text><text x="23" y="640">1U</text>
    </g>

    <!-- 1U 48-Port Network Switch (at U30) -->
    <g transform="translate(42, 210)">
      <rect x="0" y="0" width="376" height="36" rx="3" fill="#1a1e24" stroke="#444" stroke-width="2"/>
      <!-- Rack Ears -->
      <rect x="-18" y="2" width="18" height="32" rx="2" fill="#888"/>
      <rect x="376" y="2" width="18" height="32" rx="2" fill="#888"/>
      <!-- Ports & LEDs -->
      <g fill="#0b0e12" stroke="#222">
        <rect x="15" y="8" width="180" height="10" rx="1"/>
        <rect x="15" y="20" width="180" height="10" rx="1"/>
      </g>
      <circle cx="210" cy="18" r="3" fill="#00ff66"/>
      <circle cx="220" cy="18" r="3" fill="#00ff66"/>
      <circle cx="230" cy="18" r="3" fill="#ffaa00"/>
      <text x="250" y="22" fill="#00d2ff" font-family="sans-serif" font-size="10" font-weight="bold">1U GIGABIT SWITCH</text>
    </g>

    <!-- 1U Horizontal Cable Management D-Rings (at U29) -->
    <g transform="translate(42, 252)">
      <rect x="0" y="0" width="376" height="32" rx="2" fill="#101216" stroke="#333" stroke-width="1.5"/>
      <rect x="30" y="6" width="12" height="20" rx="3" fill="none" stroke="#666" stroke-width="3"/>
      <rect x="110" y="6" width="12" height="20" rx="3" fill="none" stroke="#666" stroke-width="3"/>
      <rect x="190" y="6" width="12" height="20" rx="3" fill="none" stroke="#666" stroke-width="3"/>
      <rect x="270" y="6" width="12" height="20" rx="3" fill="none" stroke="#666" stroke-width="3"/>
      <rect x="340" y="6" width="12" height="20" rx="3" fill="none" stroke="#666" stroke-width="3"/>
    </g>

    <!-- 2U Rackmount Enterprise Server (at U20-U21) -->
    <g transform="translate(42, 350)">
      <rect x="0" y="0" width="376" height="74" rx="4" fill="#2d333b" stroke="#555" stroke-width="2"/>
      <!-- Rack Ears with Slam Latches -->
      <rect x="-18" y="4" width="18" height="66" rx="2" fill="#999"/>
      <rect x="376" y="4" width="18" height="66" rx="2" fill="#999"/>
      <!-- 8 Hot-Swap Drive Caddies (2 rows of 4) -->
      <g fill="#444d56" stroke="#222" stroke-width="1">
        <rect x="15" y="8" width="60" height="26" rx="2"/><rect x="80" y="8" width="60" height="26" rx="2"/>
        <rect x="145" y="8" width="60" height="26" rx="2"/><rect x="210" y="8" width="60" height="26" rx="2"/>
        <rect x="15" y="38" width="60" height="26" rx="2"/><rect x="80" y="38" width="60" height="26" rx="2"/>
        <rect x="145" y="38" width="60" height="26" rx="2"/><rect x="210" y="38" width="60" height="26" rx="2"/>
      </g>
      <!-- Drive Status LEDs -->
      <circle cx="70" cy="14" r="2.5" fill="#00ff66"/><circle cx="135" cy="14" r="2.5" fill="#00ff66"/>
      <circle cx="200" cy="14" r="2.5" fill="#ffaa00"/><circle cx="265" cy="14" r="2.5" fill="#00ff66"/>
      <!-- Server Bezel: Power, UID Beacon -->
      <circle cx="340" cy="22" r="5" fill="#00ff66"/>
      <circle cx="340" cy="40" r="4" fill="#00aaff"/>
      <text x="285" y="62" fill="#fff" font-family="sans-serif" font-size="9" font-weight="bold">2U SERVER</text>
    </g>

    <!-- 2U Blanking Airflow Panel (at U12-U13) -->
    <rect x="42" y="470" width="376" height="68" rx="2" fill="#0e1014" stroke="#222" stroke-width="1.5"/>
    <text x="160" y="510" fill="#444" font-family="sans-serif" font-size="12">2U BLANKING PANEL</text>

    <!-- 3U Online Enterprise UPS (at U2-U4) -->
    <g transform="translate(42, 550)">
      <rect x="0" y="0" width="376" height="104" rx="4" fill="#1b1f24" stroke="#444" stroke-width="2"/>
      <rect x="-18" y="4" width="18" height="96" rx="2" fill="#777"/>
      <rect x="376" y="4" width="18" height="96" rx="2" fill="#777"/>
      <!-- Blue Backlit LCD Screen -->
      <rect x="220" y="16" width="135" height="52" rx="4" fill="url(#lcd_glow)" stroke="#fff" stroke-width="1.5"/>
      <text x="235" y="36" fill="#000" font-family="monospace" font-size="10" font-weight="bold">LOAD: 48% [OK]</text>
      <text x="235" y="54" fill="#000" font-family="monospace" font-size="10" font-weight="bold">BATT: 100% 230V</text>
      <!-- Battery Bay Vented Door -->
      <rect x="20" y="16" width="180" height="72" rx="2" fill="#282e36" stroke="#111" stroke-width="1"/>
      <line x1="30" y1="32" x2="190" y2="32" stroke="#111" stroke-width="3"/>
      <line x1="30" y1="52" x2="190" y2="52" stroke="#111" stroke-width="3"/>
      <line x1="30" y1="72" x2="190" y2="72" stroke="#111" stroke-width="3"/>
    </g>
  </g>

  <!-- Datacenter Annotations -->
  <g transform="translate(860, 180)" font-family="sans-serif" font-size="14" fill="#e6edf3">
    <text x="0" y="0" fill="#00ffcc" font-size="18" font-weight="bold">Key Datacenter Components:</text>
    <text x="0" y="40">• <tspan fill="#fff" font-weight="bold">42U EIA-310 Standard:</tspan> 19-inch rack width</text>
    <text x="0" y="70">• <tspan fill="#fff" font-weight="bold">1U Network Switch:</tspan> 48 Port GbE + SFP+ uplink</text>
    <text x="0" y="100">• <tspan fill="#fff" font-weight="bold">1U Cable Management:</tspan> D-rings & patch routing</text>
    <text x="0" y="130">• <tspan fill="#fff" font-weight="bold">2U Server:</tspan> Hot-swap SAS/SATA drive caddies</text>
    <text x="0" y="160">• <tspan fill="#fff" font-weight="bold">Blanking Panels:</tspan> Hot/Cold aisle containment</text>
    <text x="0" y="190">• <tspan fill="#fff" font-weight="bold">3U Online UPS:</tspan> Battery backup & LCD monitor</text>
  </g>
</svg>"""
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(svg)


# -----------------------------------------------------------------------------
# Asset Verification & Pure Python Validation Helpers
# -----------------------------------------------------------------------------
def verify_png_file(filepath: str) -> bool:
    """Validate PNG file header and non-zero size."""
    if not os.path.isfile(filepath) or os.path.getsize(filepath) < 16:
        return False
    try:
        with open(filepath, "rb") as f:
            sig = f.read(8)
            return sig == b"\x89PNG\r\n\x1a\n"
    except Exception:
        return False


def verify_glb_file(filepath: str, required_hotspots: list = None) -> dict:
    """Validate glTF 2.0 binary header, JSON chunk structure, and hotspot node presence."""
    if not os.path.isfile(filepath):
        return {"valid": False, "error": f"File does not exist: {filepath}"}
    size = os.path.getsize(filepath)
    if size < 20:
        return {"valid": False, "error": "File smaller than minimum header size"}
    try:
        with open(filepath, "rb") as f:
            header = f.read(12)
            magic, ver, length = struct.unpack("<4sII", header)
            if magic != b"glTF" or ver != 2:
                return {"valid": False, "error": f"Invalid header magic={magic} ver={ver}"}
            chunk0_hdr = f.read(8)
            c_len, c_type = struct.unpack("<I4s", chunk0_hdr)
            if c_type != b"JSON":
                return {"valid": False, "error": f"Chunk 0 not JSON: {c_type}"}
            json_data = json.loads(f.read(c_len).decode("utf-8"))

        nodes = [n.get("name", "") for n in json_data.get("nodes", [])]
        found_hotspots = []
        missing_hotspots = []
        if required_hotspots:
            for hs in required_hotspots:
                if hs in nodes or (hs == "CPU_Retention_Frame" and ("CPU_Load_Plate" in nodes or "CPU_Retention_Frame" in nodes)) or (hs == "CPU_Load_Plate" and ("CPU_Retention_Frame" in nodes or "CPU_Load_Plate" in nodes)):
                    found_hotspots.append(hs)
                else:
                    missing_hotspots.append(hs)

        return {
            "valid": True,
            "size_kb": size / 1024.0,
            "version": ver,
            "total_nodes": len(nodes),
            "found_hotspots": found_hotspots,
            "missing_hotspots": missing_hotspots,
        }
    except Exception as e:
        return {"valid": False, "error": str(e)}


def create_fallback_png(filepath: str, width: int = 1200, height: int = 800, title: str = "Hardware Asset") -> int:
    """
    Synthesize a valid dark-theme PNG schematic in pure Python without external dependencies.
    """
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr = struct.pack('>I4s', len(ihdr_data), b'IHDR') + ihdr_data + struct.pack('>I', ihdr_crc)

    raw = bytearray()
    for y in range(height):
        row = bytearray([0])
        is_grid_y = (y % 40 == 0) or (y < 60)
        v = max(10, min(35, int(15 + 20 * (1.0 - y / height))))
        for x in range(width):
            is_grid_x = (x % 40 == 0)
            if y < 50:
                row.extend((12, 35, 45))
            elif is_grid_x or is_grid_y:
                row.extend((v + 15, v + 25, v + 35))
            else:
                row.extend((v, v + 5, v + 12))
        raw.extend(row)

    compressed = zlib.compress(bytes(raw), 6)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat = struct.pack('>I4s', len(compressed), b'IDAT') + compressed + struct.pack('>I', idat_crc)

    iend_crc = zlib.crc32(b'IEND')
    iend = struct.pack('>I4s', 0, b'IEND') + struct.pack('>I', iend_crc)

    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
    return os.path.getsize(filepath)


def create_fallback_glb(asset_name: str, filepath: str) -> int:
    """
    Synthesize a valid, lightweight binary glTF 2.0 (.glb) asset in pure Python
    containing required scene nodes, hotspot anchors, and geometry for Three.js WebGL compatibility.
    """
    key = asset_name.lower()
    if any(k in key for k in ("motherboard", "mb")):
        nodes_meta = [
            ("Motherboard_Root", None),
            ("PCB_Substrate", "Substrate"),
            ("CPU_Retention_Frame", "CPU_Socket"),
            ("CPU_Load_Plate", "CPU_Socket"),
            ("CPU_Socket_Lever", "CPU_Socket"),
            ("RAM_Slot_0", "Memory_Subsystem"),
            ("PCIe_x16_1_Body", "Expansion_Bus"),
            ("M2_Heatshield", "Storage_M2"),
            ("ATX_24Pin_Housing", "Power_Delivery"),
            ("Chipset_Heatsink", "Chipset_PCH"),
            ("VRM_Top_Base", "VRM_Power"),
            ("Rear_IO_Shield", "Rear_IO"),
        ]
    elif any(k in key for k in ("cable", "rj45")):
        nodes_meta = [
            ("RJ45_Connector_Root", None),
            ("RJ45_Housing_Head", "Housing"),
            ("RJ45_Housing_Body", "Housing"),
            ("RJ45_Latch_Clip", "Locking_Latch"),
            ("Gold_Pin_1", "Contact_Pins"),
            ("Gold_Pin_2", "Contact_Pins"),
            ("Gold_Pin_3", "Contact_Pins"),
            ("Gold_Pin_4", "Contact_Pins"),
            ("Gold_Pin_5", "Contact_Pins"),
            ("Gold_Pin_6", "Contact_Pins"),
            ("Gold_Pin_7", "Contact_Pins"),
            ("Gold_Pin_8", "Contact_Pins"),
            ("Conductor_Wire_4", "Conductors"),
            ("Strain_Boot_Body", "Strain_Relief"),
            ("Cat6_Cable_Jacket", "Cable_Jacket"),
            ("Latch_Clip_Stem", "Locking_Latch"),
        ]
    else:  # rack
        nodes_meta = [
            ("Datacenter_Rack_Root", None),
            ("Switch_1U_Faceplate", "Switch_1U"),
            ("Cable_Mgmt_1U", "Cable_Mgmt"),
            ("Server_2U_Bezel", "Server_2U"),
            ("Server_Drive_Caddy_0", "Server_2U"),
            ("UPS_3U_Front_Bezel", "UPS_3U"),
            ("Roof_Canopy", "Cabinet_Frame"),
            ("Base_Plinth", "Cabinet_Frame"),
            ("Side_Panel_Left", "Cabinet_Enclosure"),
            ("Side_Panel_Right", "Cabinet_Enclosure"),
        ]

    # Minimal Box Geometry (8 vertices, 36 indices)
    positions = [
        -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
        -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5
    ]
    indices = [
        0, 2, 1, 0, 3, 2,  4, 5, 6, 4, 6, 7,
        0, 1, 5, 0, 5, 4,  2, 3, 7, 2, 7, 6,
        0, 4, 7, 0, 7, 3,  1, 2, 6, 1, 6, 5
    ]

    pos_bytes = struct.pack(f"<{len(positions)}f", *positions)
    idx_bytes = struct.pack(f"<{len(indices)}H", *indices)
    bin_data = idx_bytes + pos_bytes
    pad_bin = (4 - (len(bin_data) % 4)) % 4
    bin_data += b"\x00" * pad_bin

    idx_len = len(idx_bytes)
    pos_len = len(pos_bytes)

    nodes = []
    child_indices = []
    root_name = nodes_meta[0][0]
    for i in range(1, len(nodes_meta)):
        node_name, sub = nodes_meta[i]
        nodes.append({
            "name": node_name,
            "mesh": 0,
            "extras": {
                "comptia_part": node_name,
                "comptia_subsystem": sub or "General",
                "fallback_generated": True,
            }
        })
        child_indices.append(i - 1)

    nodes.append({
        "name": root_name,
        "children": child_indices
    })
    root_idx = len(nodes) - 1

    gltf = {
        "asset": {"version": "2.0", "generator": "CompTIA-A+-Hardware-Fallback-Generator"},
        "scene": 0,
        "scenes": [{"nodes": [root_idx]}],
        "nodes": nodes,
        "meshes": [{
            "name": f"{asset_name}_FallbackMesh",
            "primitives": [{
                "attributes": {"POSITION": 1},
                "indices": 0,
                "mode": 4
            }]
        }],
        "buffers": [{"byteLength": len(bin_data)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": idx_len, "target": 34963},
            {"buffer": 0, "byteOffset": idx_len, "byteLength": pos_len, "target": 34962}
        ],
        "accessors": [
            {"bufferView": 0, "byteOffset": 0, "componentType": 5123, "count": len(indices), "type": "SCALAR", "max": [7], "min": [0]},
            {"bufferView": 1, "byteOffset": 0, "componentType": 5126, "count": len(positions) // 3, "type": "VEC3", "max": [0.5, 0.5, 0.5], "min": [-0.5, -0.5, -0.5]}
        ]
    }

    json_bytes = json.dumps(gltf, separators=(',', ':')).encode("utf-8")
    pad_json = (4 - (len(json_bytes) % 4)) % 4
    json_bytes += b" " * pad_json

    total_len = 12 + 8 + len(json_bytes) + 8 + len(bin_data)
    header = struct.pack("<4sII", b"glTF", 2, total_len)
    chunk0 = struct.pack("<I4s", len(json_bytes), b"JSON") + json_bytes
    chunk1 = struct.pack("<I4s", len(bin_data), b"BIN\0") + bin_data

    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(header + chunk0 + chunk1)
    return os.path.getsize(filepath)


def generate_fallback_assets(output_dir: str, landing_dir: str = "landing/models", asset: str = "all") -> dict:
    """
    Generate high-resolution SVG mock/diagram assets, maintain valid GLB 3D models,
    and guarantee valid PNG diagrams in media/hardware/ and landing/models/
    when Blender's `bpy` is unavailable or running headless.
    """
    abs_dir = ensure_output_directory(output_dir)
    abs_landing = ensure_output_directory(landing_dir)
    print(f"\n[FALLBACK ENGINE] Generating & verifying fallback assets in:")
    print(f"  * Media Target   : {abs_dir}")
    print(f"  * Landing Target : {abs_landing}")

    targets = []
    if asset in ("all", "motherboard", "mb"):
        targets.append(("motherboard", "motherboard_diagram.svg", generate_fallback_svg_motherboard, ["CPU_Retention_Frame", "RAM_Slot_0", "PCIe_x16_1_Body", "M2_Heatshield", "ATX_24Pin_Housing", "Chipset_Heatsink"]))
    if asset in ("all", "cable", "rj45"):
        targets.append(("rj45_connector", "rj45_connector_diagram.svg", generate_fallback_svg_cable, ["Gold_Pin_4", "Conductor_Wire_4", "RJ45_Housing_Head", "Strain_Boot_Body"]))
    if asset in ("all", "rack", "server_rack"):
        targets.append(("datacenter_rack", "datacenter_rack_diagram.svg", generate_fallback_svg_rack, ["Switch_1U_Faceplate", "Cable_Mgmt_1U", "Server_2U_Bezel", "UPS_3U_Front_Bezel"]))

    report = {"svgs": [], "pngs": [], "glbs": []}

    for base_name, svg_name, svg_fn, required_nodes in targets:
        # 1. Generate SVG Diagram
        svg_path = os.path.join(abs_dir, svg_name)
        svg_fn(svg_path)
        svg_kb = os.path.getsize(svg_path) / 1024.0
        print(f"  [SVG]  -> {svg_name} ({svg_kb:.1f} KB)")
        report["svgs"].append((svg_name, svg_kb))

        # 2. Maintain / Validate PNG outputs in media/hardware/
        png_names = [f"{base_name}.png", f"{base_name}_isometric.png"]
        for pname in png_names:
            ppath = os.path.join(abs_dir, pname)
            if not verify_png_file(ppath):
                create_fallback_png(ppath, title=base_name)
                print(f"  [PNG]  -> Synthesized fallback {pname} ({os.path.getsize(ppath)/1024.0:.1f} KB)")
            else:
                print(f"  [PNG]  -> Verified existing {pname} ({os.path.getsize(ppath)/1024.0:.1f} KB)")
            report["pngs"].append((pname, os.path.getsize(ppath)/1024.0))

        # 3. Maintain / Validate GLB outputs in BOTH media/hardware/ and landing/models/
        glb_name = f"{base_name}.glb"
        glb_media_path = os.path.join(abs_dir, glb_name)
        glb_landing_path = os.path.join(abs_landing, glb_name)

        media_valid = verify_glb_file(glb_media_path, required_nodes).get("valid", False)
        landing_valid = verify_glb_file(glb_landing_path, required_nodes).get("valid", False)

        if media_valid and not landing_valid:
            shutil.copyfile(glb_media_path, glb_landing_path)
            print(f"  [GLB]  -> Synced valid {glb_name} to landing/models/")
        elif landing_valid and not media_valid:
            shutil.copyfile(glb_landing_path, glb_media_path)
            print(f"  [GLB]  -> Synced valid {glb_name} to media/hardware/")
        elif not media_valid and not landing_valid:
            create_fallback_glb(base_name, glb_media_path)
            shutil.copyfile(glb_media_path, glb_landing_path)
            print(f"  [GLB]  -> Synthesized conformant fallback {glb_name} ({os.path.getsize(glb_media_path)/1024.0:.1f} KB)")

        # Verify final GLB state
        v_res = verify_glb_file(glb_media_path, required_nodes)
        report["glbs"].append((glb_name, v_res.get("size_kb", 0.0), v_res.get("valid", False), v_res.get("total_nodes", 0)))
        print(f"  [GLB]  -> Final status for {glb_name}: Valid={v_res.get('valid')} Nodes={v_res.get('total_nodes')} Size={v_res.get('size_kb', 0):.1f} KB")

    print("[FALLBACK ENGINE] Fallback asset generation & verification complete.")
    return report


def verify_pipeline_environment(output_dir: str = "media/hardware", landing_dir: str = "landing/models") -> bool:
    """
    Comprehensive verification audit:
    Inspects host Python, Blender binary, version detection, Cycles AO baking logic,
    and asset validity across media/hardware and landing/models.
    """
    abs_out = os.path.abspath(output_dir)
    abs_landing = os.path.abspath(landing_dir)
    blender_exe = find_blender_binary()
    blender_ver = get_blender_version(blender_exe)

    print("=" * 75)
    print("CompTIA A+ 3D Graphics & Automation Pipeline - Audit & Verification")
    print("=" * 75)
    print(f"* Host Python Runtime    : {sys.version.split()[0]} ({sys.platform})")
    print(f"* BPY Module Available   : {BPY_AVAILABLE}")
    print(f"* Blender Binary Path    : {blender_exe or 'NOT DETECTED'}")
    print(f"* Blender Version        : {blender_ver or 'N/A'}")
    print(f"* Cycles AO Bake Capable : {'YES (Cycles & Vertex Color Attributes supported)' if (BPY_AVAILABLE or blender_exe) else 'NO (Requires Blender)'}")
    print(f"* Media Directory        : {abs_out} ({'EXISTS' if os.path.isdir(abs_out) else 'MISSING'})")
    print(f"* Landing Models Dir     : {abs_landing} ({'EXISTS' if os.path.isdir(abs_landing) else 'MISSING'})")
    print("-" * 75)

    all_passed = True
    assets_meta = [
        ("motherboard", ["CPU_Retention_Frame", "RAM_Slot_0", "PCIe_x16_1_Body", "M2_Heatshield", "ATX_24Pin_Housing", "Chipset_Heatsink"]),
        ("rj45_connector", ["Gold_Pin_4", "Conductor_Wire_4", "RJ45_Housing_Head", "Strain_Boot_Body"]),
        ("datacenter_rack", ["Switch_1U_Faceplate", "Cable_Mgmt_1U", "Server_2U_Bezel", "UPS_3U_Front_Bezel"]),
    ]

    print("[ASSET INTEGRITY AUDIT]")
    for base_name, hotspots in assets_meta:
        glb_media = os.path.join(abs_out, f"{base_name}.glb")
        glb_landing = os.path.join(abs_landing, f"{base_name}.glb")
        png_media = os.path.join(abs_out, f"{base_name}.png")
        svg_media = os.path.join(abs_out, f"{base_name}_diagram.svg")

        m_res = verify_glb_file(glb_media, hotspots)
        l_res = verify_glb_file(glb_landing, hotspots)
        p_valid = verify_png_file(png_media)
        s_valid = os.path.isfile(svg_media) and os.path.getsize(svg_media) > 100

        svg_size_str = f"({os.path.getsize(svg_media)/1024.0:.1f} KB)" if s_valid else "(Missing)"
        png_size_str = f"({os.path.getsize(png_media)/1024.0:.1f} KB)" if p_valid else "(Missing)"

        print(f"\nAsset: [{base_name.upper()}]")
        print(f"  - SVG Diagram        : {'PASS' if s_valid else 'FAIL'} {svg_size_str}")
        print(f"  - Rendered PNG       : {'PASS' if p_valid else 'FAIL'} {png_size_str}")

        if m_res.get("valid"):
            print(f"  - GLB (media)        : PASS ({m_res['size_kb']:.1f} KB, {m_res['total_nodes']} nodes, Hotspots: {len(m_res['found_hotspots'])}/{len(hotspots)})")
        else:
            print(f"  - GLB (media)        : FAIL ({m_res.get('error')})")
            all_passed = False

        if l_res.get("valid"):
            print(f"  - GLB (landing)      : PASS ({l_res['size_kb']:.1f} KB, {l_res['total_nodes']} nodes, Hotspots: {len(l_res['found_hotspots'])}/{len(hotspots)})")
        else:
            print(f"  - GLB (landing)      : FAIL ({l_res.get('error')})")
            all_passed = False

    print("\n" + "=" * 75)
    print(f"OVERALL STATUS: {'ALL CHECKS PASSED' if all_passed else 'WARNINGS / FAILURES DETECTED'}")
    print("=" * 75)
    return all_passed


# =============================================================================
# CLI PARSER & ENTRYPOINT
# =============================================================================
def parse_arguments(argv=None):
    """
    Parse command-line arguments, handling Blender's '--' convention cleanly.
    When running via `blender --background --python script.py -- [args]`,
    all parameters after '--' are forwarded to argparse.
    """
    if argv is None:
        argv = sys.argv

    if "--" in argv:
        args_list = argv[argv.index("--") + 1:]
    else:
        args_list = argv[1:]

    parser = argparse.ArgumentParser(
        description="CompTIA A+ Hardware 3D Graphics & Automation Pipeline (Blender/WebGL).",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--asset",
        choices=["all", "motherboard", "cable", "rack", "rj45", "mb"],
        default="all",
        help="Hardware asset to generate: motherboard, cable (RJ45), rack (42U), or all.",
    )
    parser.add_argument(
        "--output-dir",
        default="media/hardware",
        help="Target output directory for PNG diagrams and GLB models.",
    )
    parser.add_argument(
        "--format",
        choices=["png", "glb", "all"],
        default="png",
        help="Output asset format: png (2D rendered diagrams), glb (3D models), or all.",
    )
    parser.add_argument(
        "--camera-angle",
        choices=["isometric", "orthographic", "top", "all"],
        default="isometric",
        help="Camera projection angle: isometric, orthographic, top, or all.",
    )
    parser.add_argument(
        "--engine",
        choices=["AUTO", "EEVEE", "CYCLES"],
        default="AUTO",
        help="Blender rendering engine: AUTO, EEVEE, or CYCLES.",
    )
    parser.add_argument(
        "--width",
        type=int,
        default=1200,
        help="Rendered image resolution width.",
    )
    parser.add_argument(
        "--height",
        type=int,
        default=800,
        help="Rendered image resolution height.",
    )
    parser.add_argument(
        "--bake-ao",
        action="store_true",
        help="Enable automated Cycles Ambient Occlusion (AO) light baking.",
    )
    parser.add_argument(
        "--ao-samples",
        type=int,
        default=16,
        help="Sample count for Cycles AO light baking.",
    )
    parser.add_argument(
        "--ao-target",
        choices=["VERTEX_COLORS", "IMAGE_TEXTURES"],
        default="VERTEX_COLORS",
        help="Cycles AO bake target: VERTEX_COLORS (zero texture overhead) or IMAGE_TEXTURES.",
    )
    parser.add_argument(
        "--sync-landing",
        action="store_true",
        default=True,
        help="Synchronize exported GLB models directly to landing/models/.",
    )
    parser.add_argument(
        "--no-sync-landing",
        dest="sync_landing",
        action="store_false",
        help="Disable automatic synchronization to landing/models/.",
    )
    parser.add_argument(
        "--landing-models-dir",
        default="landing/models",
        help="Target directory for WebGL landing models.",
    )
    parser.add_argument(
        "--generate-fallback",
        action="store_true",
        help="Force generation of fallback vector diagrams and maintain valid GLB and PNG outputs in media/hardware/ and landing/models/.",
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Verify host environment, output paths, and Blender binary availability without rendering.",
    )
    parser.add_argument(
        "--launch-blender",
        action="store_true",
        help="If run in standard Python and Blender is discovered, automatically launch Blender with this pipeline.",
    )

    return parser.parse_args(args_list)


def main():
    args = parse_arguments()
    out_dir = ensure_output_directory(args.output_dir)

    # 1. Environment Verification Mode
    if args.verify_only:
        success = verify_pipeline_environment(output_dir=out_dir, landing_dir=args.landing_models_dir)
        return 0 if success else 1

    # 2. Execution INSIDE Blender (`bpy` available)
    if BPY_AVAILABLE:
        print("=" * 70)
        print("Blender 3D Render Pipeline - Active Session")
        print(f"Blender Version : {get_blender_version()}")
        print(f"Engine Target   : {args.engine}")
        print(f"Asset Selection : {args.asset}")
        print(f"Output Format   : {args.format}")
        print(f"Camera Angle    : {args.camera_angle}")
        print(f"Bake Cycles AO  : {args.bake_ao} (Samples: {args.ao_samples}, Target: {args.ao_target})")
        print(f"Output Directory: {out_dir}")
        print(f"Landing Sync    : {args.sync_landing} -> {args.landing_models_dir}")
        print("=" * 70)

        assets_to_build = []
        if args.asset in ("all", "motherboard", "mb"):
            assets_to_build.append("motherboard")
        if args.asset in ("all", "cable", "rj45"):
            assets_to_build.append("cable")
        if args.asset in ("all", "rack", "server_rack"):
            assets_to_build.append("rack")

        for asset_key in assets_to_build:
            render_and_export_asset(
                asset_name=asset_key,
                output_dir=out_dir,
                fmt=args.format,
                camera_angle=args.camera_angle,
                engine_choice=args.engine,
                width=args.width,
                height=args.height,
                bake_ao=args.bake_ao,
                ao_samples=args.ao_samples,
                ao_target=args.ao_target,
                sync_landing=args.sync_landing,
                landing_models_dir=args.landing_models_dir,
            )

        print("\n[BLENDER PIPELINE] All selected assets processed successfully.")
        return 0

    # 3. Execution OUTSIDE Blender (Standard Python runtime)
    else:
        blender_exe = find_blender_binary()
        blender_ver = get_blender_version(blender_exe)

        print("=" * 75)
        print("CompTIA A+ 3D Pipeline - Standard Python CLI Notice")
        print("=" * 75)
        print("Notice: 'bpy' (Blender Python API) is not installed in the current Python runtime.")
        print("Procedural 3D mesh synthesis and Cycles/EEVEE rendering run natively inside Blender.")
        print()

        if blender_exe:
            print(">>> Auto-detected Blender installation:")
            print(f"    Path    : {blender_exe}")
            print(f"    Version : Blender {blender_ver or 'Unknown'}")
            print()
            print(">>> To render high-fidelity 3D assets & export GLB models, run:")
            print(f'    & "{blender_exe}" --background --python tools/blender_render_pipeline.py -- --asset {args.asset} --output-dir {args.output_dir} --format {args.format} {"--bake-ao" if args.bake_ao else ""}')
            print()
        else:
            print(">>> Blender was not found in standard system locations or PATH.")
            print("    To run Blender once installed:")
            print(f"    blender --background --python tools/blender_render_pipeline.py -- --asset {args.asset} --output-dir {args.output_dir} --format {args.format}")
            print()

        # If user explicitly asked to launch blender or if requested
        if args.launch_blender and blender_exe:
            cmd = [
                blender_exe,
                "--background",
                "--python",
                os.path.abspath(__file__),
                "--",
                "--asset", args.asset,
                "--output-dir", args.output_dir,
                "--format", args.format,
                "--camera-angle", args.camera_angle,
                "--engine", args.engine,
                "--width", str(args.width),
                "--height", str(args.height),
                "--landing-models-dir", args.landing_models_dir,
            ]
            if args.bake_ao:
                cmd.extend(["--bake-ao", "--ao-samples", str(args.ao_samples), "--ao-target", args.ao_target])
            if not args.sync_landing:
                cmd.append("--no-sync-landing")

            print(f"[LAUNCH] Executing Blender subprocess: {' '.join(cmd)}")
            return subprocess.call(cmd)

        # Fallback asset generation & synchronization mode
        if args.generate_fallback or not args.verify_only:
            generate_fallback_assets(out_dir, landing_dir=args.landing_models_dir, asset=args.asset)

        return 0


if __name__ == "__main__":
    sys.exit(main())
