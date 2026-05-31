import json

# ---------------------- 配置 ----------------------
INPUT_FILE = "家族谱牒数据全量备份_2026-05-31 (6).json"
OUTPUT_FILE = "李氏家谱_清洗排序_夫妻同组.json"
# ---------------------------------------------------

def load_data():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def clean_member(m):
    # 只清洗空值，不改动性别、不删字段
    cleaned = {}
    for k, v in m.items():
        cleaned[k] = v if v != "" else None
    return cleaned

def sort_members(members):
    # 1. 按辈分从小到大排序
    members = sorted(members, key=lambda x: x["generation"])

    # 2. 建立配偶快速查找表
    spouse_map = {m["id"]: m for m in members}

    # 3. 已输出标记，避免重复
    used = set()
    sorted_list = []

    for m in members:
        if m["id"] in used:
            continue

        # 本组：本人 + 配偶（如有）
        group = [m]
        used.add(m["id"])

        spouse_id = m.get("spouseId")
        if spouse_id and spouse_id in spouse_map and spouse_id not in used:
            spouse = spouse_map[spouse_id]
            group.append(spouse)
            used.add(spouse_id)

        sorted_list.extend(group)

    return sorted_list

def main():
    data = load_data()
    members = data.get("members", [])

    # 清洗
    cleaned = [clean_member(m) for m in members]
    # 排序（按代 + 夫妻绑定）
    sorted_mem = sort_members(cleaned)

    # 生成新JSON
    data["members"] = sorted_mem
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("✅ 清洗排序完成！")
    print(f"📄 输出文件：{OUTPUT_FILE}")
    print(f"👨‍👩‍👧‍👦 共处理：{len(sorted_mem)} 人")

    # 控制台预览
    print("\n===== 排序预览（按代·夫妻同组）=====")
    current_gen = None
    for m in sorted_mem:
        gen = m["generation"]
        if gen != current_gen:
            current_gen = gen
            print(f"\n【第{gen}代】")
        spouse_name = ""
        if m.get("spouseId"):
            sp = next((x for x in sorted_mem if x["id"] == m["spouseId"]), None)
            spouse_name = f"｜配偶：{sp['name'] if sp else '无'}"
        print(f"  {m['name']}（{m['gender']}）{spouse_name}")

if __name__ == "__main__":
    main()
