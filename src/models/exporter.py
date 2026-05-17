# Export all objects to a separate file.
# Each collection is a region and can be a single string to occupy a list.

import bpy

print("Export started...")
if bpy.app.version[0] != 5: print("Warning: This script expects Blender major version 5.")


D = bpy.data

REGIONS = ['main']


def simplify(number, dp=None):
    """Lossy compression of a number."""
    _num = round(number, dp)
    if _num % 1 == 0: return int(_num)
    return _num


def stringify_scratch(list_object):
    """Escape special characters and join into one string, delimited by semicolon."""
    return ';'.join([str(elem).replace('\\', '\\\\').replace(';', '\\;') for elem in list_object])


def create_length_prefixed_list(list_object):
    """Create a list where the first element is a count of the numbers after it."""
    result = [len(list_object)]
    for elem in list_object:
        result.extend(list(elem))
    return result



def get_bounding_box_from_modifier(obj):
    """Extract the bounding box from the custom geometry nodes setup, from an object."""
    gn_mod = None
    for mod in obj.modifiers:
        if mod.type == 'NODES' and mod.node_group and mod.node_group.name == "bounding_box":
            gn_mod = mod
            break

    if gn_mod is None: return ([0,0,0],[0,0,0]) # defaults

    return (list(gn_mod["Socket_2"]), list(gn_mod["Socket_3"]))


def get_line_segments(obj):
    mesh = obj.data

    edges_world = []

    for edge in mesh.edges:
        v0 = mesh.vertices[edge.vertices[0]].co
        v1 = mesh.vertices[edge.vertices[1]].co

        v0_world = obj.matrix_world @ v0
        v1_world = obj.matrix_world @ v1

        edges_world.append([
            simplify(v0_world.x, 3), simplify(v0_world.y, 3), simplify(v0_world.z, 3),
            simplify(v1_world.x, 3), simplify(v1_world.y, 3), simplify(v1_world.z, 3)
        ])

    return edges_world


def get_triangles(obj):
    mesh = obj.data
    
    mesh.calc_loop_triangles()
    
    triangles = []
    
    for tri in mesh.loop_triangles:
        coords = []
        for vert_idx in tri.vertices:
            v = obj.matrix_world @ mesh.vertices[vert_idx].co
            coords.extend((simplify(v.x, 3), simplify(v.y, 3), simplify(v.z, 3)))
        triangles.append(coords)
    
    return triangles


def get_mesh(mesh, vert_index_offset=0):
    """
    Takes a bpy.types.Mesh and returns:
      vertices: [(x, y, z), ...]
      uvs: [(u, v), ...]
      triangles: [[v0, v1, v2, uv0, uv1, uv2], ...]
    """

    mesh.calc_loop_triangles()

    vertices = [(simplify(v.co.x, 3), simplify(v.co.y, 3), simplify(v.co.z, 3)) for v in mesh.vertices]

    uv_layer = mesh.uv_layers.active
    if uv_layer is None: raise RuntimeError("Mesh has no active UV map")

    triangles = []
    uv_points = []
    uv_points_lookup = {}
    uv_points_lookup_count = 0

    for tri in mesh.loop_triangles:
        tri_verts = list(tri.vertices)
        tri_loops = tri.loops

        tri_data = [
            tri_verts[0] + vert_index_offset,
            tri_verts[1] + vert_index_offset,
            tri_verts[2] + vert_index_offset,
        ]

        # Add UVs per loop
        for loop_idx in tri_loops:
            uv = uv_layer.data[loop_idx].uv
            uv_rounded = (int(round(uv.x*10000)), int(round(uv.y*10000)))

            if uv_rounded not in uv_points_lookup:
                uv_points_lookup[uv_rounded] = uv_points_lookup_count
                uv_points.append(uv_rounded)
                uv_points_lookup_count += 1
            
            tri_data.append(uv_points_lookup[uv_rounded])

        triangles.append(tri_data)

    return vertices, uv_points, triangles




output = []

for region_name in REGIONS:
    print("Exporting region: " + str(region_name))

    region_visible_objects = []
    visible_objects_total = 0
    vertex_total = 0 # objects of a region all share the same list of verts and need offset indices
    uv_total = 0
    tri_total = 0

    region_walls = []
    walls_total = 0
    wall_seg_total = 0

    region_floors = []
    floors_total = 0
    floor_tri_total = 0

    collection = D.collections[region_name]
    for object in collection.objects.values():
        #print(object.name)
        object_name = object.name.split('.')

        if object_name[0] != region_name: continue

        if object_name[1] == 'WL': # Wall
            ls = get_line_segments(object)
            region_walls.extend(ls)
            wall_seg_total += len(ls)
            walls_total += 1

        elif object_name[1] == 'FL': # Floor object
            ft = get_triangles(object)
            region_floors.extend(ft)
            floor_tri_total += len(ft)
            floors_total += 1

        elif object_name[1] == 'VZ' or object_name[1] == 'DY': # Visible mesh
            
            if len(object_name) >= 4 and object_name[3] == 'BB':
                print(f"Warning: BB mesh is no longer used. {object.name} has been skipped.")
                continue
            
            bb_min, bb_max = get_bounding_box_from_modifier(object)
            
            verts, uvs, tris = get_mesh(object.data, vertex_total)
            
            vertex_total += len(verts)
            uv_total += len(uvs)
            tri_total += len(tris)
            
            ro = []
            ro.append(object.name) # name
            ro.extend([simplify(v, 4) for v in list(object.location.xyz)]) # location
            ro.append(int(object_name[1] == 'DY')) # dynamicity
            ro.append(object.material_slots[0].name) # material
            ro.extend([simplify(v, 4) for v in list(bb_min) + list(bb_max)]) # bounding box
            ro.extend(create_length_prefixed_list(verts)) # verts
            ro.extend(create_length_prefixed_list(uvs)) # uv points
            ro.extend(create_length_prefixed_list(tris)) # tris
            region_visible_objects.append(ro)
            
            visible_objects_total += 1
            
        else:
            pass #print('unknown object')

    print(f"  {visible_objects_total} visible objects containing {vertex_total} verts, {uv_total} UVs, {tri_total} tris.")
    print(f"  {walls_total} walls containing {wall_seg_total} segments.")
    print(f"  {floors_total} floors containing {floor_tri_total} tris.")


    output.append(stringify_scratch([region_name] + create_length_prefixed_list(region_visible_objects) + create_length_prefixed_list(region_walls) + create_length_prefixed_list(region_floors)) + '\n')




with open('region_names.txt', 'w') as f:
    f.writelines([r + '\n' for r in REGIONS])

with open('regions.txt', 'w') as f:
    f.writelines(output)

print("Finished!")
