# Schema Drift Report — 2026-08-05

**Base:** `appT1VyuwHzKGhOId` — Helen Doron Kyrgyzstan — School OS  
**Server:** `bruin-ops-1`, `/home/kevinschoolos` (`school-os-dashboard.service` active)  
**Baseline frozen:** 2026-07-16T08:27:43.645Z  
**Compared:** 2026-08-05

---

## Verdict

**Drift is additive only. Zero breaking issues. Deploys are not blocked.**

Every difference falls into a `scripts/schema-diff.mjs` *warning* branch (table added, field
added). None falls into a *breaking* branch (table removed, tier changed, field removed, field
type changed, readOnly changed). The gate would print **48 warnings** and **exit 0**.

This is a planning input, not an incident. It does mean the app is unaware of roughly a third
of the base — see *Blockers to adoption*.

## Counts

| | Baseline | Live | Δ |
| :--- | ---: | ---: | ---: |
| Tables | 27 | 39 | +12 |
| Fields | 336 | 529 | +193 |

| | `schemaHash` |
| :--- | :--- |
| Baseline | `44bb45e22634576c6fd30278219db0be4608ca76f61a43ef9ce4a70b67adc71a` |
| Live | `ba6a698bcd6491c7813c84f6667906ea4dd381394c61b2c095e8718512c280d6` |

| Change class | Count |
| :--- | ---: |
| Tables added | 12 |
| Tables removed | 0 |
| Tables renamed | 0 |
| Fields added to existing tables | 36 |
| Fields in new tables | 157 |
| Fields removed | 0 |
| Fields renamed | 0 |
| Field types changed | 0 |

### Method

Live schema read from the Airtable Meta API (`/v0/meta/bases/{baseId}/tables`) through the
Airtable connector — **not** the production `AIRTABLE_PAT`, since gate #2 is still open. Metadata
only; no record data was fetched.

The live hash was recomputed with the project's own `generateSchemaHash()` from
`lib/fetch-airtable-schema.mjs:108`, so it is directly comparable to what `schema-diff.mjs`
would produce. Table and field matching is by **ID**, never by name.

---

## New tables (12) — 157 fields

Numbered 28–39 and thematically coherent: franchise operations, sub-franchising, fixed assets,
and teacher certification. This looks like a deliberate expansion, not accidental drift.

| # | tableId | Fields | Proposed tier | Name |
| :--- | :--- | ---: | :--- | :--- |
| 28 | `tblO38n2QCCEdey10` | 13 | T4 Reference | 28 Backpack Inventory / Инвентарь рюкзаков |
| 29 | `tblBbv8UPCF6TAYqy` | 15 | T3 Operational | 29 TTCs / Курсы подготовки преподавателей |
| 30 | `tblRMtJRf9oYfWtqt` | 10 | T1 Financial | 30 Budget & Targets / Бюджет и цели |
| 31 | `tbl5P27dUHrKWOMw2` | 13 | T1 Financial | 31 Fixed Assets / Основные средства |
| 32 | `tblqJGJRambPzTePj` | 13 | T1 Financial | 32 Build-Out Projects / Проекты открытия центров |
| 33 | `tblPSNnBHuyRj9C6N` | 11 | T3 Operational | 33 Marketing Campaigns / Маркетинговые кампании |
| 34 | `tbl1JpraNHlYrvYU0` | 11 | T2 PII | 34 Documents / Документы |
| 35 | `tblns9BnLFvsJrdOW` | 25 | T2 PII | 35 Sub-Franchisees (LCF/LSF) / Субфранчайзи |
| 36 | `tblx5V0x0s6kbr56l` | 13 | T1 Financial | 36 Sub-Franchise Royalties / Роялти субфранчайзи |
| 37 | `tbltNBkGhwTiItU6B` | 10 | T2 PII | 37 SETs / Самозанятые преподаватели |
| 38 | `tblpepGaPbfVlBv74` | 13 | T3 Operational | 38 Minimum Goals / Минимальные цели |
| 39 | `tbleVIIZdAmIlFcZS` | 10 | T1 Financial | 39 Franchise Obligations / Обязательства франшизы |

> **Tiers above are proposed, not decided.** Tier assignment drives redaction and role access,
> so it is an Owner call under gates #4/#5. **Recommendation: grant all 12 to `owner` only**
> until each has been reviewed. Three deserve particular scrutiny:
>
> - **34 Documents** (T2 PII) — May hold scans of minors' records — KG Law No. 97 applies.
> - **35 Sub-Franchisees (LCF/LSF)** (T2 PII) — Named individuals / franchise partners.
> - **37 SETs** (T2 PII) — Self-employed teachers — personal + tax data.

### Field detail

#### 28 Backpack Inventory / Инвентарь рюкзаков

`tblO38n2QCCEdey10` · 13 fields · proposed **T4 Reference**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldx5KbfjYmIF1AiN` | Level Name / Уровень | `singleLineText` |
| `fldhpOnpoEnXXN8RL` | Total Backpacks / Всего рюкзаков | `number` |
| `fld8aVSU2lg5WzqHR` | Sold / Продано | `number` |
| `fldktMnyEsVaF03ii` | Selling Price (KGS) / Цена продажи (сом) | `currency` |
| `fldBfxbNuTe2xIvFD` | Date Received / Дата получения | `date` |
| `fldtuQS6u6Tri48ve` | Supplier / Поставщик | `singleLineText` |
| `fldtouN3wXqMeVs9V` | Purchase Cost (KGS) / Себестоимость (сом) | `currency` |
| `fldW2aLYeRFRSTvFP` | Notes / Заметки | `multilineText` |
| `fldwaW8Hsu9r4soBd` | Remaining / Остаток | `formula` |
| `fldjumjFFrvc0Ze9b` | Gross Profit per Backpack (KGS) / Валовая прибыль (сом) | `formula` |
| `fldHfOvTMq5n5FXxk` | Branch / Филиал | `multipleRecordLinks` |
| `fldmPwxp41lxT1lc2` | Related Services Royalty 8% (KGS) / Роялти 8% (сом) | `formula` |
| `fldD6Gs0uL2FsqrtP` | Net Profit per Backpack (KGS) / Чистая прибыль (сом) | `formula` |

#### 29 TTCs / Курсы подготовки преподавателей

`tblBbv8UPCF6TAYqy` · 15 fields · proposed **T3 Operational**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldnYxluPJk4ZcpnB` | TTC ID / ID курса | `singleLineText` |
| `fldOqNr6Mo4SkyiQZ` | Programme / Программа | `singleSelect` |
| `fldBCHqqw3yICMtHs` | Start Date / Дата начала | `date` |
| `fldARO0bEv6fhx2IZ` | End Date / Дата окончания | `date` |
| `fldat06pEmLbXXX77` | Location / Место | `singleLineText` |
| `fldwdkSifeVDlzwew` | Trainer / Тренер | `singleLineText` |
| `fldE5jMOGEydLRfch` | Participants / Участников | `number` |
| `fldm2P1bn0q6DUzs7` | Fee per Participant (KGS) / Стоимость за участника (сом) | `currency` |
| `fld1xWv24l4lPqcGJ` | Materials Cost (KGS) / Стоимость материалов (сом) | `currency` |
| `fldNijmSlTcK6JVjV` | Status / Статус | `singleSelect` |
| `flde1b7oQixFbjHXz` | Notes / Заметки | `multilineText` |
| `fldaAIl60DkkTh8tE` | Branch / Филиал | `multipleRecordLinks` |
| `fld9Z88uGQ4GrOHm7` | Teachers Trained / Обученные преподаватели | `multipleRecordLinks` |
| `fldX07yAv1ASg4jgZ` | Total Revenue (KGS) / Выручка (сом) | `formula` |
| `fldHkbOnXiycnrUpX` | Net Revenue (KGS) / Чистая выручка (сом) | `formula` |

#### 30 Budget & Targets / Бюджет и цели

`tblRMtJRf9oYfWtqt` · 10 fields · proposed **T1 Financial**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldAfOXzE4oPGKOMD` | Line / Строка | `singleLineText` |
| `fldSBljGfPZDqWZol` | Period / Период | `date` |
| `fldf0Pqo7b5Jhhp1d` | Type / Тип | `singleSelect` |
| `fldVkjfw1AblBeYsb` | Category / Категория | `singleSelect` |
| `flduL47ASUjGOuRgA` | Target Amount (KGS) / План (сом) | `currency` |
| `fldt9G33hSN6qDRco` | Actual Amount (KGS) / Факт (сом) | `currency` |
| `fldMmstdSVkwhkwby` | Notes / Заметки | `multilineText` |
| `fldIJLbtAN5Y64Sns` | Branch / Филиал | `multipleRecordLinks` |
| `fldkH0BkC7SqqAwbk` | Variance (KGS) / Отклонение (сом) | `formula` |
| `flde3bCL9gvxEz5oE` | Variance % / Отклонение % | `formula` |

#### 31 Fixed Assets / Основные средства

`tbl5P27dUHrKWOMw2` · 13 fields · proposed **T1 Financial**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldGE11vfx7ddT3IU` | Asset / Актив | `singleLineText` |
| `fldB645tnnRW78pKH` | Category / Категория | `singleSelect` |
| `fld3cWaXmN6XuezMQ` | Acquisition Date / Дата приобретения | `date` |
| `fld41DEO1wCOv2Tdx` | Cost (KGS) / Стоимость (сом) | `currency` |
| `fld2P1d0E7Kt9My8L` | Useful Life (years) / Срок службы (лет) | `number` |
| `fldkuwDLD1ITmzmgK` | Accumulated Depreciation (KGS) / Накопленная амортизация (сом) | `currency` |
| `fldmOrpvyKIUqXXXC` | Status / Статус | `singleSelect` |
| `fldj1tSnsxRqxCLXe` | Notes / Заметки | `multilineText` |
| `fldjOQcMr9BlZbfzu` | Branch / Филиал | `multipleRecordLinks` |
| `fldlT5JntDYj1HpLE` | Vendor / Поставщик | `multipleRecordLinks` |
| `fldeNb0slXS6tac2o` | Book Value (KGS) / Балансовая стоимость (сом) | `formula` |
| `fldSxTpgHZYQRiU4r` | Annual Depreciation (KGS) / Годовая амортизация (сом) | `formula` |
| `fldLSMRO4GZRHSUqP` | Build-Out Project / Проект открытия | `multipleRecordLinks` |

#### 32 Build-Out Projects / Проекты открытия центров

`tblqJGJRambPzTePj` · 13 fields · proposed **T1 Financial**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldpGCqvVv3uO8fPi` | Project / Проект | `singleLineText` |
| `fldVtlpRGMhIoFZM3` | Sub-Area / Район | `singleLineText` |
| `fldfpxbHAcxDxIW5R` | Type / Тип | `singleSelect` |
| `fldM6EW8YlQcWV2dn` | Status / Статус | `singleSelect` |
| `fldwfnxzjaXwvnOeb` | Target Open Date / Плановая дата открытия | `date` |
| `fldo0VcPaOOCn1rn4` | Actual Open Date / Фактическая дата открытия | `date` |
| `fldc4Vfe0oWjFrsnz` | Budget (KGS) / Бюджет (сом) | `currency` |
| `fldiSdxGbTcfRPHB4` | Actual Spend (KGS) / Фактические затраты (сом) | `currency` |
| `fldqHZHHyayUCKvue` | Notes / Заметки | `multilineText` |
| `fld6gnBF7JNnrZP7M` | Branch / Филиал | `multipleRecordLinks` |
| `fldmbtA39UbwIMlAI` | Variance (KGS) / Отклонение (сом) | `formula` |
| `fldNz804wF8IWUUkh` | 31 Fixed Assets / Основные средства | `multipleRecordLinks` |
| `fldHLfFokfWDUiCXl` | 35 Sub-Franchisees (LCF/LSF) / Субфранчайзи | `multipleRecordLinks` |

#### 33 Marketing Campaigns / Маркетинговые кампании

`tblPSNnBHuyRj9C6N` · 11 fields · proposed **T3 Operational**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldkCgK0Pop8zOli9` | Campaign / Кампания | `singleLineText` |
| `fld2EoNKaZnxcqqfD` | Channel / Канал | `singleSelect` |
| `fldp4LpOLasnalJJl` | Start Date / Дата начала | `date` |
| `fldqHUOKuVJvGgr64` | End Date / Дата окончания | `date` |
| `fldIkbgSd3ez4vu3e` | Spend (KGS) / Затраты (сом) | `currency` |
| `fldtHMk8UylxoQm8j` | Status / Статус | `singleSelect` |
| `fldbazbAhOEp2NCwz` | Objective / Цель | `multilineText` |
| `fldxz1w8btL8MFrTp` | Leads / Лиды | `multipleRecordLinks` |
| `fldgvaZu402noU8BZ` | Branch / Филиал | `multipleRecordLinks` |
| `fldhkqNAhj0GbwA1y` | Leads Generated / Привлечено лидов | `count` |
| `fldDdnPVgYNyAg4dP` | Cost per Lead (KGS) / Стоимость лида (сом) | `formula` |

#### 34 Documents / Документы

`tbl1JpraNHlYrvYU0` · 11 fields · proposed **T2 PII**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldUH05b6xUuPpgMS` | Document / Документ | `singleLineText` |
| `fld1MaHn2Q18IYQmW` | Type / Тип | `singleSelect` |
| `fldv53DtsaF1yC7s7` | Party / Сторона | `singleLineText` |
| `fldKS8rOWoyxxp6iO` | Effective Date / Дата вступления | `date` |
| `fld6vt5wjYwqOb2ir` | Expiry / Renewal Date / Дата окончания | `date` |
| `fldVV3L5iX4pYQEjn` | Status / Статус | `singleSelect` |
| `fldZtZylTOEDDn121` | File / Файл | `multipleAttachments` |
| `fldT8eX9TJvF0DGJQ` | Notes / Заметки | `multilineText` |
| `fldosENiG3kipLyfB` | Branch / Филиал | `multipleRecordLinks` |
| `fld0JUTH3vPU96j2w` | Days to Renewal / Дней до продления | `formula` |
| `fldJVPoiiaJ9zYoFO` | 35 Sub-Franchisees (LCF/LSF) / Субфранчайзи | `multipleRecordLinks` |

#### 35 Sub-Franchisees (LCF/LSF) / Субфранчайзи

`tblns9BnLFvsJrdOW` · 25 fields · proposed **T2 PII**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldHtqBTlorpoZUWX` | Franchisee Name / Название франчайзи | `singleLineText` |
| `fldFOLmmfRN4nvWoB` | Type / Тип | `singleSelect` |
| `fldFMSZkmBA4sMUXk` | Sub-Area / Район | `singleLineText` |
| `fld3IOK2RksquIWPh` | Population Served / Население района | `number` |
| `fldr7MzbE89PI2EUv` | Contact Name / Контактное лицо | `singleLineText` |
| `fldggf1KurmdeFH6H` | Phone / Телефон | `phoneNumber` |
| `fldqlcfdGkQg0jjag` | Email / Эл. почта | `email` |
| `fldyZS8xNhrfTf6bJ` | Status / Статус | `singleSelect` |
| `fldIDGondp9YdBHfK` | Agreement Signed Date / Дата подписания | `date` |
| `fldAf8wtYhOvB5kD8` | Open Date / Дата открытия | `date` |
| `fldvQOQUNeXqHgw0b` | Grace Period End / Конец льготного периода | `date` |
| `fldeAMr13XqAE6yzX` | Franchise Fee (EUR) / Франшизный взнос (EUR) | `currency` |
| `fldfgr13W1677d8q3` | Expected Students (Royalty Basis) / Ожидаемых учеников | `number` |
| `fld1GrC3L1P2bg0Ln` | Students Reported / Учеников в отчёте | `number` |
| `fldjG72A7V62RPB9e` | Lesson Fee (KGS) / Стоимость урока (сом) | `currency` |
| `fldRRKaykqEQCOotl` | Annual Lesson Count / Уроков в год | `number` |
| `fldpVqQCyxjM3lDoy` | Royalty Rate % / Ставка роялти % | `percent` |
| `fldfIvpsxZlcOAPXS` | Notes / Заметки | `multilineText` |
| `fldscs0gsnlmKRe5Q` | Build-Out Project / Проект открытия | `multipleRecordLinks` |
| `fldBxTXZJ3qhohzO1` | Documents / Документы | `multipleRecordLinks` |
| `fldlXP9y2prsgGqID` | 36 Sub-Franchise Royalties / Роялти субфранчайзи | `multipleRecordLinks` |
| `fldXC4fN4FiSmFsxK` | 37 SETs / Самозанятые преподаватели | `multipleRecordLinks` |
| `fldE4NfboA0xCXgnJ` | Actual Fixed Royalty (Annual, KGS) / Годовое фикс. роялти (сом) | `formula` |
| `fldLhesvU6n9vtCL9` | MF Fee Share to HQ (EUR) / Доля взноса HQ (EUR) | `formula` |
| `fld4WsId9rybFMXnU` | In Grace Period? / В льготном периоде? | `formula` |

#### 36 Sub-Franchise Royalties / Роялти субфранчайзи

`tblx5V0x0s6kbr56l` · 13 fields · proposed **T1 Financial**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fld64NGZ78KyXqplO` | Royalty No / Номер роялти | `singleLineText` |
| `fld7Pv17ijta1Yjkv` | Period / Период | `date` |
| `fldchsxtKEUrg60Bp` | Franchisee / Франчайзи | `multipleRecordLinks` |
| `fldCyof6PP304xcl7` | Monthly Royalty Due (KGS) / Роялти к получению (сом) | `currency` |
| `flduaqSYY0ZrkVMN6` | Amount Received (KGS) / Получено (сом) | `currency` |
| `fldzppXXT9Wk0xSPk` | Status / Статус | `singleSelect` |
| `fldRkLsCCIpm52YMz` | Due Date / Срок оплаты | `date` |
| `fldTmN6y8jVTCp8LF` | Received Date / Дата получения | `date` |
| `fldun6oJ8MwQ91dX8` | HQ Share % / Доля HQ % | `percent` |
| `fld7aD2c90ZGHDzRQ` | Notes / Заметки | `multilineText` |
| `fldlPGjcmC1ybgtxw` | 37 SETs / Самозанятые преподаватели | `multipleRecordLinks` |
| `fldpd2VqxDcsvixei` | Balance (KGS) / Остаток (сом) | `formula` |
| `fld1Q5bVie7krlrEG` | HQ Share (KGS) / Доля HQ (сом) | `formula` |

#### 37 SETs / Самозанятые преподаватели

`tbltNBkGhwTiItU6B` · 10 fields · proposed **T2 PII**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldYUk6XgVmjl1uvM` | SET Name / ФИО | `singleLineText` |
| `fldTaQWjGuIVeyXXa` | Phone / Телефон | `phoneNumber` |
| `fld4OGF7gwHsFvhUO` | Email / Эл. почта | `email` |
| `fldaz7VZIrWioat4A` | Status / Статус | `singleSelect` |
| `fldzQopiJPUzlAURg` | Reports To / Относится к | `multipleRecordLinks` |
| `fldU61dlU5u1dWkD2` | Students / Учеников | `number` |
| `fldKvYeaxeN9JCLZ4` | Royalty Rate % / Ставка роялти % | `percent` |
| `fldZvKDcDITnObkBD` | Start Date / Дата начала | `date` |
| `fldO5VT31d6CSywYh` | Notes / Заметки | `multilineText` |
| `fldeapEgFxxJQJj8j` | Sub-Franchise Royalties / Роялти | `multipleRecordLinks` |

#### 38 Minimum Goals / Минимальные цели

`tblpepGaPbfVlBv74` · 13 fields · proposed **T3 Operational**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldYpnEUjmowVHJoB` | Goal Year / Год цели | `singleLineText` |
| `fldh5XS5jbjlknOui` | School Year / Учебный год | `singleLineText` |
| `fldKwiTeHqOrcnwpT` | Target Students / Цель (учеников) | `number` |
| `fldo6uLFbbEb2j4RF` | Start Date / Начало | `date` |
| `fldbaI3f0EPXhHhCd` | End Date / Конец | `date` |
| `fldFEUi4m3hRy1L5x` | MF-owned Students / Учеников собств. центра | `number` |
| `fldKofnyDx0Mz7xKN` | LCF/LSF Students / Учеников франчайзи | `number` |
| `fld2MO7BHJwJZ51yd` | SET Students / Учеников SET | `number` |
| `fldJuMgnBugPKzAXz` | Notes / Заметки | `multilineText` |
| `fldxT09L5HSOeJCT3` | Total Area Students / Всего учеников | `formula` |
| `fldXiNSWzs3SFbV9p` | Gap to Goal / Разрыв до цели | `formula` |
| `fldXfU0CPUXVMjlXw` | % of Goal / % цели | `formula` |
| `fldmwlbVzkynyqVOG` | Status / Статус | `formula` |

#### 39 Franchise Obligations / Обязательства франшизы

`tbleVIIZdAmIlFcZS` · 10 fields · proposed **T1 Financial**

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldAtrbSX5jwIaiiV` | Obligation / Обязательство | `singleLineText` |
| `fldvtxbqVmUxMCVoR` | Category / Категория | `singleSelect` |
| `fldeY8IzBHdqS9AeL` | MFA Clause / Пункт MFA | `singleLineText` |
| `fldPUsrFu7WsfofWG` | Cadence / Периодичность | `singleSelect` |
| `fldMBiDFZNjcBPhKa` | Next Due Date / Следующий срок | `date` |
| `fldUCzXFRcBLu4qA5` | Amount (EUR) / Сумма (EUR) | `currency` |
| `fldT4FKMIIOMHNIxv` | Penalty / Штраф | `singleLineText` |
| `fldVnGlS0KmnVNak6` | Status / Статус | `singleSelect` |
| `fldSqWzQqVGN9Gr5J` | Notes / Заметки | `multilineText` |
| `fldy72CE5dDtW5yJX` | Days to Due / Дней до срока | `formula` |

---

## New fields on existing tables (36)

Grouped by the table they were added to. Several are link fields that merely point at the new
tables above; the rest are genuine capability additions.

### 01 Branches / Филиалы

`tbl2utdNdP9usMXLf` · 28 → 35 fields (+7)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldk4KZO6sldUZ0Gn` | 28 Backpack Inventory / Инвентарь рюкзаков | `multipleRecordLinks` |
| `fldosZpLkodnBKl5P` | 29 TTCs / Курсы подготовки преподавателей | `multipleRecordLinks` |
| `fldzbf7FuWiT5UyG8` | 30 Budget & Targets / Бюджет и цели | `multipleRecordLinks` |
| `fldJk1iXRaHsm86El` | 31 Fixed Assets / Основные средства | `multipleRecordLinks` |
| `fldqTJqyJyZioGRL3` | 32 Build-Out Projects / Проекты открытия центров | `multipleRecordLinks` |
| `fldS83P29TmgKEyHS` | 33 Marketing Campaigns / Маркетинговые кампании | `multipleRecordLinks` |
| `fld697jJsf0IjqXmg` | 34 Documents / Документы | `multipleRecordLinks` |

### 02 Users / Сотрудники

`tblUkEhqFJBFTvRN5` · 14 → 19 fields (+5)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldVuWgqDXynqLYJc` | 29 TTCs / Курсы подготовки преподавателей | `multipleRecordLinks` |
| `fldk7VkXF4NEE5Zn1` | Programmes Certified / Сертифицированные программы | `multipleSelects` |
| `fld3oHpTSq7X00jIB` | TTC Completed Date / Дата прохождения TTC | `date` |
| `fldLPVzms9txNdTpX` | Teacher Level / Уровень преподавателя | `singleSelect` |
| `fld5fsjtkR1E2BcHc` | Qualification Status / Статус квалификации | `singleSelect` |

### 04 Tuition Plans / Тарифные планы

`tbldiIHLyH7bup2XG` · 8 → 13 fields (+5)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldEEn1ydkLEWDDfn` | Discount / Скидка | `checkbox` |
| `fld8euHTkCd4gutyg` | Discount Type / Тип скидки | `singleSelect` |
| `fld5Lop5tmv9f6JC8` | Discount Value / Размер скидки | `number` |
| `fldEc5zcubOQAN5yz` | Discount Reason / Причина скидки | `singleSelect` |
| `fldhBe0Mg9IPel7AZ` | Net Amount (KGS) / Итого к оплате (сом) | `formula` |

### 07 Leads / Лиды

`tblItZ3B7d4YRO9ih` · 19 → 21 fields (+2)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fld0XM2wfroNux6qt` | Referred By / Кто порекомендовал | `singleLineText` |
| `fldx4CMfZ2WbIsZsi` | 33 Marketing Campaigns / Маркетинговые кампании | `multipleRecordLinks` |

### 10 Students / Ученики

`tbl9Ddw4uRQ3i6e1B` · 13 → 19 fields (+6)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldJ9WPx3YGLaZhEU` | Withdrawal Date / Дата отчисления | `date` |
| `fld1mmys4N9MGjsEf` | Reason for Leaving / Причина ухода | `singleSelect` |
| `fldFJtT0mMHcQuEC4` | Pause Reason / Причина паузы | `singleSelect` |
| `fldZCMbjKfOHBhPa9` | First Enroll Date / Дата первого зачисления | `rollup` |
| `fldzpHQOs0EyG2uuO` | Cohort Month / Месяц когорты | `formula` |
| `fldaYH29vzzSvYi8D` | Age at Withdrawal / Возраст при отчислении | `formula` |

### 11 Class Groups / Группы

`tblpUJni7tMvO2QBs` · 13 → 15 fields (+2)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldrPYdkK20io4VVo` | Enrolled Count / Зачислено | `count` |
| `fldPJpcz3xsIYc4IK` | Utilisation % / Заполненность % | `formula` |

### 12 Enrollments / Зачисления

`tblVA5O7fnBx5cAnJ` · 23 → 26 fields (+3)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldj4rnd6RcQrZEWf` | Next Payment Date / Дата следующего платежа | `date` |
| `fldsTa7YnJYNyUOEt` | End Date / Дата окончания | `date` |
| `fldV6NE7X3PWFU0tR` | Tenure (months) / Длительность (мес.) | `formula` |

### 15 Invoices / Счета

`tblTB6N6jNqSFvEER` · 12 → 14 fields (+2)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldY6vKlBdfd4oZ8q` | Amount Paid (KGS) / Оплачено (сом) | `rollup` |
| `fldxRzzNfggP9ezbT` | Balance (KGS) / Остаток (сом) | `formula` |

### 17 Chart of Accounts / План счетов

`tblLkuBm7zVJKpzzu` · 11 → 12 fields (+1)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldzWQA33bCm31avg` | Balance (KGS) / Баланс (сом) | `rollup` |

### 20 Vendors / Поставщики

`tblAu08dz4NZJ5HDs` · 9 → 10 fields (+1)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldhZBJYSnjsT0qeB` | 31 Fixed Assets / Основные средства | `multipleRecordLinks` |

### 22 Franchise Royalties / Роялти франшизы

`tbl2YiFYDq00gJIrF` · 15 → 17 fields (+2)

| fieldId | Name | Type |
| :--- | :--- | :--- |
| `fldEBJmNPvPRGsdIw` | FX Rate (KGS per EUR) / Курс (сом за EUR) | `number` |
| `fldUmEKHHxeKCKgzf` | Total Due HQ (EUR) / Итого к оплате HQ (EUR) | `formula` |

### What these additions imply

- **Students** gained a full withdrawal/churn model (`Withdrawal Date`, `Reason for Leaving`,
  `Pause Reason`) plus cohort analytics (`First Enroll Date`, `Cohort Month`,
  `Age at Withdrawal`). Retention reporting is now possible at the source.
- **Users** gained teacher-certification tracking (`Programmes Certified`, `TTC Completed Date`,
  `Teacher Level`, `Qualification Status`), paired with the new TTCs table.
- **Tuition Plans** gained a discount block (`Discount`, `Discount Type`, `Discount Value`,
  `Discount Reason`, `Net Amount (KGS)`). Any pricing logic in the app that assumes a single
  gross amount is now incomplete.
- **Invoices** and **Chart of Accounts** gained balance rollups (`Amount Paid`, `Balance`).
  Note `Balance (KGS)` on Invoices is a **formula** and `Balance (KGS)` on Chart of Accounts is a
  **rollup** — both are computed and belong in the write-forbidden registry.
- **Franchise Royalties** gained FX handling (`FX Rate (KGS per EUR)`, `Total Due HQ (EUR)`).
- **Enrollments** gained `Next Payment Date`, `End Date`, `Tenure (months)`.
- **Class Groups** gained `Enrolled Count` and `Utilisation %` — capacity reporting.

### Computed fields added (write-forbidden)

These are formula/rollup/count fields and must never be written. They are **not** yet in the
Write-Forbidden Field Registry in `CLAUDE.md` §5:

| Table | Field | Type |
| :--- | :--- | :--- |
| 04 Tuition Plans | Net Amount (KGS) / Итого к оплате (сом) | `formula` |
| 10 Students | First Enroll Date / Дата первого зачисления | `rollup` |
| 10 Students | Cohort Month / Месяц когорты | `formula` |
| 10 Students | Age at Withdrawal / Возраст при отчислении | `formula` |
| 11 Class Groups | Enrolled Count / Зачислено | `count` |
| 11 Class Groups | Utilisation % / Заполненность % | `formula` |
| 12 Enrollments | Tenure (months) / Длительность (мес.) | `formula` |
| 15 Invoices | Amount Paid (KGS) / Оплачено (сом) | `rollup` |
| 15 Invoices | Balance (KGS) / Остаток (сом) | `formula` |
| 17 Chart of Accounts | Balance (KGS) / Баланс (сом) | `rollup` |
| 22 Franchise Royalties | Total Due HQ (EUR) / Итого к оплате HQ (EUR) | `formula` |

---

## Blockers to adoption

Nothing below is broken *today* — deny-by-default keeps the unknown tables safely inaccessible.
These are the obstacles to bringing the new tables into the app.

### 1. `TIER_MAP` has no entries for tables 28–39 — and it is duplicated

`resolveTier()` **throws** on an unmatched table name. Regenerating the config would abort with
`FATAL: Unmatched table name` on all 12 new tables.

- `scripts/generate-field-map.mjs:89` (map at :23–60, called at :107)
- `scripts/schema-diff.mjs:66` (map at :18–55)

The two copies must be edited together. Better: extract to one shared module so they cannot
diverge. Note the matcher is a substring test on the table name, so renaming a table in Airtable
can silently re-tier it or crash the generator.

### 2. `prismaToTableId` is a third hardcoded copy of the table inventory

`lib/airtableProxy.ts:81–109` — 27 entries, not derived from `field-map.json`, with no validation
that the two agree. Any adoption must update this by hand as well.

### 3. `config/rbac-matrix.json` has no rules for the new tables

Deny-by-default means all 12 are currently forbidden to every role — correct and safe. Adoption
requires deliberate per-role grants, which is an Owner decision under gates #4/#5.

### 4. Re-freezing the baseline needs Owner approval

Gate #6 and `CLAUDE.md` §13. One operational caveat: `scripts/generate-field-map.mjs` **writes**
`field-map.json` and `schema-baseline.json` (:389–390) *before* running its validators (:222, :288).
A validation failure therefore leaves modified config on disk. Regenerate on a branch, never on
a dirty tree.

### 5. Two drift implementations can disagree

`app/api/dashboard/admin/schema-diagnostics/route.ts` re-implements the diff independently and
detects only added/removed/renamed tables and field type changes — **not** removed fields, added
fields, readOnly changes, or tier changes, and it has no breaking-vs-warning distinction. Against
the current drift the script reports 48 warnings while the diagnostics route reports 12 added
tables and nothing else.

---

## Recommended sequence (for the Owner)

1. Confirm the 12 new tables are intended and sign off on the proposed tiers.
2. Extract `TIER_MAP` into one shared module; add entries for 28–39.
3. Decide RBAC grants per new table — recommend `owner`-only to start.
4. Add the new computed fields to the Write-Forbidden Field Registry (`CLAUDE.md` §5).
5. Regenerate `field-map.json` + `schema-baseline.json` on a branch; review the diff.
6. Update `prismaToTableId`, or replace it with a derivation from `field-map.json`.
7. Bring the diagnostics route's diff logic in line with `schema-diff.mjs`.

---

## Appendix — unrelated finding: GitHub PAT in the git remote

Not schema-related, found while inspecting the repo. `.git/config` on the VPS embeds a live
GitHub personal access token in the `origin` URL:

```
https://ghp_<REDACTED>@github.com/developertesting336-lgtm/kevinschoolos.git
```

This contradicts `CLAUDE.md` §11 (*"Do NOT place an API key or PAT in this file, any script, any
config"*). The token grants **write** access to the repository, and it was rendered in terminal
output during this session — so **rotation is the priority**, not just rewriting the URL.

```bash
# 1. Revoke the exposed token at https://github.com/settings/tokens
# 2. Re-point the remote without embedded credentials
git remote set-url origin https://github.com/developertesting336-lgtm/kevinschoolos.git
# 3. Confirm no token remains
git remote -v
```

Then authenticate with a credential helper or a deploy key instead. Worth also checking whether
the token was ever committed into tracked files or CI config.

---

*Schema metadata only — no student, parent, or payment record data was read or is recorded here.*