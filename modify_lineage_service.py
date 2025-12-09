with open('backend/services/lineage_service.py', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'def get_column_lineage_graph' in line:
        # 在方法定义后的第3行（即文档字符串后的第一行）插入方向映射
        insert_pos = i + 3
        lines.insert(insert_pos, '        # 方向映射：将upstream/downstream转换为内部使用的up/down\n')
        lines.insert(insert_pos + 1, '        direction_map = {"upstream": "up", "downstream": "down"}\n')
        lines.insert(insert_pos + 2, '        direction = direction_map.get(direction, direction)\n')
        break

with open('backend/services/lineage_service.py', 'w') as f:
    f.writelines(lines)
