"""Локальная база текстов норм для быстрой проверки содержимого курса.

Команды (из корня репозитория):
    python norms/norm.py fetch                 скачать тексты заново (все документы из DOCS)
    python norms/norm.py fetch ГОСТ21.613      скачать один документ
    python norms/norm.py index                 разбить тексты на пункты -> norms/index.json
    python norms/norm.py show ПУЭ 2.1.56       показать текст пункта (ПУЭ, ПОТЭЭ, СП256, ГОСТ12.1.038)
    python norms/norm.py show ПУЭ табл. 1.7.1  показать таблицу
    python norms/norm.py show 184-ФЗ 7         статья закона или техрегламента (номер статьи)
    python norms/norm.py grep ПУЭ "трубопровод" поиск по тексту документа (регулярное выражение)
    python norms/norm.py list                  какие документы есть и сколько в них пунктов

Тексты — официальные нормативные документы (ПУЭ, ПОТЭЭ, СП 256.1325800.2016 с изменениями до 2022 г.,
ГОСТ 12.1.038-82). Источники перечислены в DOCS; при сомнении сверяй с официальной публикацией.
"""
import html
import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEXT = HERE / 'text'
UA = {'User-Agent': 'Mozilla/5.0 (shkola-shchitovika norm check)'}

PUE_CHAPTERS = ['1-1', '1-2', '1-3', '1-4', '1-5', '1-6', '1-7', '1-8', '1-9', '2-1', '2-2', '2-3', '2-4', '2-5',
                '3-1', '3-2', '3-3', '3-4', '4-1', '4-2', '4-3', '4-4', '5-1', '5-2', '5-3', '5-4', '5-5', '5-6',
                '6-1', '6-2', '6-3', '6-4', '6-5', '6-6', '7-1', '7-2', '7-3', '7-4', '7-5', '7-6', '7-7', '7-10']
DOCS = {
    'ПУЭ': {'file': 'pue.txt', 'title': 'Правила устройства электроустановок (6-е и 7-е изд.)',
            'src': [f'https://www.ruscable.ru/info/pue/{c}.html' for c in PUE_CHAPTERS]},
    'ПОТЭЭ': {'file': 'potee.txt', 'title': 'Правила по охране труда при эксплуатации электроустановок (приказ Минтруда № 903н, ред. 2022)',
              'src': ['https://base.garant.ru/400164786/53f89421bbdaf741eb2d1ecc4ddb4c33/',
                      'https://base.garant.ru/400164786/b89690251be5277812a78962f6302560/']},
    'СП256': {'file': 'sp256.txt', 'title': 'СП 256.1325800.2016 «Электроустановки жилых и общественных зданий» (с изм. 1–5)',
              'src': ['https://22.mchs.gov.ru/uploads/resource/2023-03-02/8cd1efa9150e03022668bf3a9b3922e2.docx']},
    'ГОСТ12.1.038': {'file': 'gost-12-1-038.txt', 'title': 'ГОСТ 12.1.038-82 «Предельно допустимые значения напряжений прикосновения и токов»',
                     'src': ['https://meganorm.ru/Data2/1/4294852/4294852033.htm']},
    'ГОСТ21.613': {'file': 'gost-21-613.txt', 'title': 'ГОСТ 21.613-2014 «СПДС. Правила выполнения рабочей документации силового электрооборудования»',
                   'src': ['https://meganorm.ru/Data2/1/4293767/4293767642.htm']},
    'ГОСТР21.101': {'file': 'gost-r-21-101.txt', 'title': 'ГОСТ Р 21.101-2020 «СПДС. Основные требования к проектной и рабочей документации»',
                    'src': ['https://meganorm.ru/Data2/1/4293720/4293720404.htm']},
    'ГОСТ31996': {'file': 'gost-31996.txt', 'title': 'ГОСТ 31996-2012 «Кабели силовые с пластмассовой изоляцией на номинальное напряжение 0,66; 1 и 3 кВ» (с изм. 1)',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_31996-2012_mezhgosudarstvennyy_standart_kabeli_silovye.html']},
    'ГОСТ61008': {'file': 'gost-iec-61008-1.txt', 'title': 'ГОСТ IEC 61008-1-2020 «Выключатели автоматические, управляемые дифференциальным током, бытового и аналогичного назначения без встроенной защиты от сверхтоков. Часть 1»',
                  'src': ['https://meganorm.ru/Data2/1/4293719/4293719492.htm']},
    'ГОСТР50571.11': {'file': 'gost-r-50571-11.txt', 'title': 'ГОСТ Р 50571.11-96 (МЭК 364-7-701-84) «Ванные и душевые помещения» — на него ссылаются ПУЭ п. 7.1.47',
                      'src': ['https://meganorm.ru/Data2/1/4294850/4294850650.htm']},
    'ГОСТ32395': {'file': 'gost-32395.txt', 'title': 'ГОСТ 32395-2020 «Щитки распределительные для жилых зданий. Общие технические условия»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_32395-2020_mezhgosudarstvennyy_standart_shchitki.html']},
    'ГОСТ32397': {'file': 'gost-32397.txt', 'title': 'ГОСТ 32397-2020 «Щитки распределительные для производственных и общественных зданий. Общие технические условия»',
                  'src': ['https://meganorm.ru/Data/741/74110.pdf']},
    'ГОСТ2.702': {'file': 'gost-2-702.txt', 'title': 'ГОСТ 2.702-2011 «ЕСКД. Правила выполнения электрических схем»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/3/gost_2_702-2011_mezhgosudarstvennyy_standart_edinaya_sistema.html']},
    'ГОСТР50571.16': {'file': 'gost-r-50571-16.txt', 'title': 'ГОСТ Р 50571.16-2019 «Электроустановки низковольтные. Часть 6. Испытания» (IEC 60364-6:2016)',
                      'src': ['https://meganorm.ru/Data/708/70834.pdf']},
    'ГОСТ60898': {'file': 'gost-iec-60898-1.txt', 'title': 'ГОСТ IEC 60898-1-2020 «Автоматические выключатели для защиты от сверхтоков бытового и аналогичного назначения. Часть 1. Для переменного тока»',
                  'src': ['https://meganorm.ru/Data2/1/4293719/4293719523.htm']},
    'ГОСТ60269': {'file': 'gost-iec-60269-1.txt', 'title': 'ГОСТ IEC 60269-1-2016 «Предохранители низковольтные плавкие. Часть 1. Общие требования»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/1/gost_IEC_60269-1-2016_mezhgosudarstvennyy_standart.html']},
    'ГОСТ32144': {'file': 'gost-32144.txt', 'title': 'ГОСТ 32144-2013 «Нормы качества электрической энергии в системах электроснабжения общего назначения»',
                  'src': ['https://www.helpeng.ru/public/normdoc/gost/gost_32144-2013.pdf']},
    'ГОСТ31565': {'file': 'gost-31565.txt', 'title': 'ГОСТ 31565-2012 «Кабельные изделия. Требования пожарной безопасности»',
                  'src': ['https://meganorm.ru/Data2/1/4293780/4293780771.htm']},
    'ГОСТ2.701': {'file': 'gost-2-701.txt', 'title': 'ГОСТ 2.701-2008 «ЕСКД. Схемы. Виды и типы. Общие требования к выполнению»',
                'src': ['https://meganorm.ru/Data2/1/4293830/4293830651.htm']},
    'ГОСТ2.709': {'file': 'gost-2-709.txt', 'title': 'ГОСТ 2.709-89 «ЕСКД. Обозначения условные проводов и контактных соединений электрических элементов, оборудования и участков цепей в электрических схемах»',
                'src': ['https://meganorm.ru/Data2/1/4294845/4294845187.htm']},
    'ГОСТ2.710': {'file': 'gost-2-710.txt', 'title': 'ГОСТ 2.710-81 «ЕСКД. Обозначения буквенно-цифровые в электрических схемах»',
                'src': ['https://meganorm.ru/Data2/1/4294845/4294845189.htm']},
    'ГОСТ2.721': {'file': 'gost-2-721.txt', 'title': 'ГОСТ 2.721-74 «ЕСКД. Обозначения условные графические в схемах. Обозначения общего применения»',
                'src': ['https://meganorm.ru/Data2/1/4294852/4294852095.htm']},
    'ГОСТ2.723': {'file': 'gost-2-723.txt', 'title': 'ГОСТ 2.723-68 «ЕСКД. Обозначения условные графические в схемах. Катушки индуктивности, дроссели, трансформаторы, автотрансформаторы и магнитные усилители»',
                'src': ['https://meganorm.ru/Data2/1/4294833/4294833337.htm']},
    'ГОСТ2.727': {'file': 'gost-2-727.txt', 'title': 'ГОСТ 2.727-68 «ЕСКД. Обозначения условные графические в схемах. Разрядники, предохранители»',
                'src': ['https://meganorm.ru/Data2/1/4294833/4294833334.htm']},
    'ГОСТ2.728': {'file': 'gost-2-728.txt', 'title': 'ГОСТ 2.728-74 «ЕСКД. Обозначения условные графические в схемах. Резисторы, конденсаторы»',
                'src': ['https://meganorm.ru/Data2/1/4294847/4294847788.htm']},
    'ГОСТ2.729': {'file': 'gost-2-729.txt', 'title': 'ГОСТ 2.729-68 «ЕСКД. Обозначения условные графические в схемах. Приборы электроизмерительные»',
                'src': ['https://meganorm.ru/Data2/1/4294848/4294848013.htm']},
    'ГОСТ2.732': {'file': 'gost-2-732.txt', 'title': 'ГОСТ 2.732-68 «ЕСКД. Обозначения условные графические в схемах. Источники света»',
                'src': ['https://meganorm.ru/Data2/1/4294848/4294848036.htm']},
    'ГОСТ2.755': {'file': 'gost-2-755.txt', 'title': 'ГОСТ 2.755-87 «ЕСКД. Обозначения условные графические в электрических схемах. Устройства коммутационные и контактные соединения»',
                'src': ['https://meganorm.ru/Data2/1/4294849/4294849486.htm']},
    'ГОСТ2.756': {'file': 'gost-2-756.txt', 'title': 'ГОСТ 2.756-76 «ЕСКД. Обозначения условные графические в схемах. Воспринимающая часть электромеханических устройств»',
                'src': ['https://meganorm.ru/Data2/1/4294849/4294849487.htm']},
    'ГОСТ21.210': {'file': 'gost-21-210.txt', 'title': 'ГОСТ 21.210-2014 «СПДС. Изображения условные графические электрооборудования и проводок на планах»',
                 'src': ['https://meganorm.ru/Data2/1/4293767/4293767646.htm']},
    'ГОСТР50462': {'file': 'gost-r-50462.txt', 'title': 'ГОСТ Р 50462-2009 (МЭК 60446:2007) «Идентификация проводников посредством цветов и буквенно-цифровых обозначений»',
                 'src': ['https://meganorm.ru/Data2/1/4293824/4293824333.htm']},
    'ФЗ184': {'file': 'fz-184.txt', 'title': 'Федеральный закон от 27.12.2002 № 184-ФЗ «О техническом регулировании» (действующая редакция)',
            'src': ['https://legalacts.ru/doc/federalnyi-zakon-ot-27122002-n-184-fz-o/']},
    'ФЗ162': {'file': 'fz-162.txt', 'title': 'Федеральный закон от 29.06.2015 № 162-ФЗ «О стандартизации в Российской Федерации» (действующая редакция)',
            'src': ['https://legalacts.ru/doc/federalnyi-zakon-ot-29062015-n-162-fz-o/']},
    'ТРТС004': {'file': 'tr-ts-004.txt', 'title': 'ТР ТС 004/2011 «О безопасности низковольтного оборудования» (решение Комиссии Таможенного союза от 16.08.2011 № 768, ред. от 11.05.2023)',
              'src': ['https://meganorm.ru/mega_doc/dop_fire_update_01022025/postanovlenie_dvenadtsatogo_arbitrazhnogo_apellyatsionnogo/0/reshenie_komissii_tamozhennogo_soyuza_ot_16_08_2011_N_768.html']},
    'ГОСТ1.3': {'file': 'gost-1-3.txt', 'title': 'ГОСТ 1.3-2014 «Межгосударственная система стандартизации. Стандарты межгосударственные. Правила разработки на основе международных и региональных стандартов»',
              'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/18/gost_1_3-2014_mezhgosudarstvennyy_standart.html']},
    'ГОСТ1.5': {'file': 'gost-1-5.txt', 'title': 'ГОСТ 1.5-2001 «Межгосударственная система стандартизации. Стандарты межгосударственные… Общие требования к построению, изложению, оформлению, содержанию и обозначению» (с изм. 1, 2)',
              'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/1/gost_1_5-2001_mezhgosudarstvennyy_standart.html']},
    'ГОСТР50571.4.41': {'file': 'gost-r-50571-4-41.txt', 'title': 'ГОСТ Р 50571.4.41-2022 (IEC 60364-4-41:2017) «Электроустановки низковольтные. Часть 4-41. Защита от поражения электрическим током»',
                      'src': ['https://meganorm.ru/Data/786/78667.pdf']},
    'ГОСТР50571.4.43': {'file': 'gost-r-50571-4-43.txt', 'title': 'ГОСТ Р 50571.4.43-2012 (МЭК 60364-4-43:2008) «Электроустановки низковольтные. Часть 4-43. Защита от сверхтока»',
                      'src': ['https://meganorm.ru/Data2/1/4293777/4293777996.htm']},
    'ГОСТР50571.5.52': {'file': 'gost-r-50571-5-52.txt', 'title': 'ГОСТ Р 50571.5.52-2011 (МЭК 60364-5-52:2009) «Электроустановки низковольтные. Часть 5-52. Электропроводки»',
                      'src': ['https://meganorm.ru/Data2/1/4293792/4293792410.htm']},
    'ГОСТР50571.5.54': {'file': 'gost-r-50571-5-54.txt', 'title': 'ГОСТ Р 50571.5.54-2024 (IEC 60364-5-54:2021, MOD) «Электроустановки низковольтные. Часть 5-54. Заземляющие устройства и защитные проводники»',
                      'src': ['https://meganorm.ru/Data/831/83142.pdf']},
    'ГОСТ61009': {'file': 'gost-iec-61009-1.txt', 'title': 'ГОСТ IEC 61009-1-2020 «Выключатели автоматические, срабатывающие от остаточного тока, со встроенной защитой от тока перегрузки… Часть 1. Общие правила»',
                'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_IEC_61009-1-2020_mezhgosudarstvennyy_standart.html']},
    'ГОСТ62423': {'file': 'gost-iec-62423.txt', 'title': 'ГОСТ IEC 62423-2013 «Автоматические выключатели, управляемые дифференциальным током, типа F и типа B…»',
                'src': ['https://meganorm.ru/Data/572/57288.pdf']},
    'ГОСТ60755': {'file': 'gost-iec-tr-60755.txt', 'title': 'ГОСТ IEC/TR 60755-2017 «Устройства защитные, управляемые дифференциальным (остаточным) током. Общие требования»',
                'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/1/gost_IEC_TR_60755-2017_mezhgosudarstvennyy_standart.html']},
    'ГОСТР70646.1': {'file': 'gost-r-70646-1.txt', 'title': 'ГОСТ Р 70646.1-2023 «Воздействие электрического тока на людей и домашних животных. Часть 1. Общие аспекты»',
                   'src': ['https://meganorm.ru/mega_doc/norm/gost-r_gosudarstvennyj-standart/8/gost_r_70646_1-2023_natsionalnyy_standart_rossiyskoy.html']},
    'ГОСТ61439.1': {'file': 'gost-iec-61439-1.txt', 'title': 'ГОСТ IEC 61439-1-2024 «Устройства комплектные низковольтные распределения и управления. Часть 1. Общие требования»',
                  'src': ['https://meganorm.ru/Data/841/84177.pdf']},
    'ГОСТ61439.3': {'file': 'gost-iec-61439-3.txt', 'title': 'ГОСТ IEC 61439-3-2015 «Устройства комплектные низковольтные распределения и управления. Часть 3. Распределительные щиты, предназначенные для управления неквалифицированными лицами»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/2/gost_IEC_61439-3-2015_mezhgosudarstvennyy_standart.html']},
    'ГОСТ22483': {'file': 'gost-22483.txt', 'title': 'ГОСТ 22483-2021 (IEC 60228:2004) «Жилы токопроводящие для кабелей, проводов и шнуров» (с поправками)',
                'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_22483-2021_IEC_60228_2004_mezhgosudarstvennyy_standart.html']},
    'ГОСТ60947.1': {'file': 'gost-iec-60947-1.txt', 'title': 'ГОСТ IEC 60947-1-2017 «Аппаратура распределения и управления низковольтная. Часть 1. Общие правила»',
                  'src': ['https://meganorm.ru/Data/704/70437.pdf']},
    'ГОСТ60947.2': {'file': 'gost-iec-60947-2.txt', 'title': 'ГОСТ IEC 60947-2-2021 «Аппаратура распределения и управления низковольтная. Часть 2. Автоматические выключатели»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_IEC_60947-2-2021_mezhgosudarstvennyy_standart.html']},
    'ГОСТ60947.3': {'file': 'gost-iec-60947-3.txt', 'title': 'ГОСТ IEC 60947-3-2022 «Аппаратура распределения и управления низковольтная. Часть 3. Выключатели, разъединители, выключатели-разъединители и их комбинации с предохранителями»',
                  'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/0/gost_IEC_60947-3-2022_mezhgosudarstvennyy_standart.html']},
    'ГОСТ60947.4.1': {'file': 'gost-iec-60947-4-1.txt', 'title': 'ГОСТ IEC 60947-4-1-2021 «Аппаратура распределения и управления низковольтная. Часть 4-1. Электромеханические контакторы и пускатели»',
                    'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/13/gost_IEC_60947-4-1-2021_mezhgosudarstvennyy_standart.html']},
    'ГОСТ14254': {'file': 'gost-14254.txt', 'title': 'ГОСТ 14254-2015 (IEC 60529:2013) «Степени защиты, обеспечиваемые оболочками (Код IP)»',
                'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/2/gost_14254-2015_IEC_60529_2013_mezhgosudarstvennyy_standart.html']},
    'ГОСТР58698': {'file': 'gost-r-58698.txt', 'title': 'ГОСТ Р 58698-2019 (МЭК 61140:2016) «Защита от поражения электрическим током. Общие положения для электроустановок и электрооборудования»',
                 'src': ['https://meganorm.ru/mega_doc/norm/gost-r_gosudarstvennyj-standart/2/gost_r_58698-2019_mek_61140_2016_natsionalnyy_standart.html']},
    'ГОСТ29322': {'file': 'gost-29322.txt', 'title': 'ГОСТ 29322-2014 (IEC 60038:2009) «Напряжения стандартные»',
                'src': ['https://meganorm.ru/Data/584/58416.pdf']},
    'ГОСТ61643': {'file': 'gost-iec-61643-11.txt', 'title': 'ГОСТ IEC 61643-11-2013 «Устройства защиты от импульсных перенапряжений низковольтные. Часть 11. Требования и методы испытаний»',
                'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/3/gost_IEC_61643-11-2013_mezhgosudarstvennyy_standart.html']},
    'ГОСТ12.1.030': {'file': 'gost-12-1-030.txt', 'title': 'ГОСТ 12.1.030-81 «ССБТ. Электробезопасность. Защитное заземление, зануление»',
                   'src': ['https://meganorm.ru/Data2/1/4294852/4294852036.htm']},
    'ГОСТ12.1.019': {'file': 'gost-12-1-019.txt', 'title': 'ГОСТ 12.1.019-2017 «ССБТ. Электробезопасность. Общие требования и номенклатура видов защиты»',
                   'src': ['https://meganorm.ru/mega_doc/norm/gost_gosudarstvennyj-standart/1/gost_12_1_019-2017_mezhgosudarstvennyy_standart_sistema.html']},
}
# порядок важен: сначала точные названия ГОСТов, потом короткое «ГОСТ»
ALIASES = {'ПУЭ': 'ПУЭ', 'PUE': 'ПУЭ', 'ПОТЭЭ': 'ПОТЭЭ', 'POTEE': 'ПОТЭЭ', 'СП256': 'СП256', 'СП': 'СП256', 'SP256': 'СП256',
           'ГОСТ12.1.038': 'ГОСТ12.1.038', 'ГОСТ21.613': 'ГОСТ21.613', 'ГОСТР21.101': 'ГОСТР21.101', 'ГОСТ31996': 'ГОСТ31996', 'ГОСТ31565': 'ГОСТ31565',
           'ГОСТIEC61008': 'ГОСТ61008', 'ГОСТ61008': 'ГОСТ61008', 'ГОСТIEC60269': 'ГОСТ60269', 'ГОСТIEC60898': 'ГОСТ60898', 'ГОСТР50571.16': 'ГОСТР50571.16', 'ГОСТ2.702': 'ГОСТ2.702', 'ГОСТ32395': 'ГОСТ32395', 'ГОСТ32397': 'ГОСТ32397', 'ГОСТР50571.11': 'ГОСТР50571.11', 'ГОСТ60898': 'ГОСТ60898', 'ГОСТ60269': 'ГОСТ60269', 'ГОСТ32144': 'ГОСТ32144',
           'ГОСТ2.701': 'ГОСТ2.701', 'ГОСТ2.709': 'ГОСТ2.709', 'ГОСТ2.710': 'ГОСТ2.710', 'ГОСТ2.721': 'ГОСТ2.721', 'ГОСТ2.723': 'ГОСТ2.723', 'ГОСТ2.727': 'ГОСТ2.727', 'ГОСТ2.728': 'ГОСТ2.728', 'ГОСТ2.729': 'ГОСТ2.729', 'ГОСТ2.732': 'ГОСТ2.732', 'ГОСТ2.755': 'ГОСТ2.755', 'ГОСТ2.756': 'ГОСТ2.756', 'ГОСТ21.210': 'ГОСТ21.210', 'ГОСТР50462': 'ГОСТР50462', 'ГОСТ50462': 'ГОСТР50462',
           'ФЗ184': 'ФЗ184', '184-ФЗ': 'ФЗ184', '184ФЗ': 'ФЗ184', 'ФЗ162': 'ФЗ162', '162-ФЗ': 'ФЗ162', '162ФЗ': 'ФЗ162', 'ТРТС004': 'ТРТС004', 'ТРТС': 'ТРТС004', 'ГОСТ1.3': 'ГОСТ1.3', 'ГОСТ1.5': 'ГОСТ1.5', 'ГОСТР50571.4.41': 'ГОСТР50571.4.41', 'ГОСТР50571.4.43': 'ГОСТР50571.4.43', 'ГОСТР50571.5.52': 'ГОСТР50571.5.52', 'ГОСТР50571.5.54': 'ГОСТР50571.5.54', 'ГОСТIEC61009': 'ГОСТ61009', 'ГОСТ61009': 'ГОСТ61009', 'ГОСТIEC62423': 'ГОСТ62423', 'ГОСТ62423': 'ГОСТ62423', 'ГОСТIEC/TR60755': 'ГОСТ60755', 'ГОСТIECTR60755': 'ГОСТ60755', 'ГОСТ60755': 'ГОСТ60755', 'ГОСТР70646.1': 'ГОСТР70646.1', 'ГОСТIEC61439-1': 'ГОСТ61439.1', 'ГОСТ61439.1': 'ГОСТ61439.1', 'ГОСТ61439-1': 'ГОСТ61439.1', 'ГОСТIEC61439-3': 'ГОСТ61439.3', 'ГОСТ61439.3': 'ГОСТ61439.3', 'ГОСТ61439-3': 'ГОСТ61439.3', 'ГОСТ22483': 'ГОСТ22483', 'ГОСТIEC60947-4-1': 'ГОСТ60947.4.1', 'ГОСТ60947.4.1': 'ГОСТ60947.4.1', 'ГОСТ60947-4-1': 'ГОСТ60947.4.1', 'ГОСТIEC60947-1': 'ГОСТ60947.1', 'ГОСТ60947.1': 'ГОСТ60947.1', 'ГОСТ60947-1': 'ГОСТ60947.1', 'ГОСТIEC60947-2': 'ГОСТ60947.2', 'ГОСТ60947.2': 'ГОСТ60947.2', 'ГОСТ60947-2': 'ГОСТ60947.2', 'ГОСТIEC60947-3': 'ГОСТ60947.3', 'ГОСТ60947.3': 'ГОСТ60947.3', 'ГОСТ60947-3': 'ГОСТ60947.3', 'ГОСТ14254': 'ГОСТ14254', 'ГОСТР58698': 'ГОСТР58698', 'ГОСТ29322': 'ГОСТ29322', 'ГОСТIEC61643': 'ГОСТ61643', 'ГОСТ61643': 'ГОСТ61643', 'ГОСТ12.1.030': 'ГОСТ12.1.030', 'ГОСТ12.1.019': 'ГОСТ12.1.019',
           'ГОСТ': 'ГОСТ12.1.038'}


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def html_to_text(raw: bytes) -> str:
    s = None
    m = re.search(rb'charset=["\']?([\w-]+)', raw[:4000], re.I)
    for enc in ([m.group(1).decode()] if m else []) + ['utf-8', 'cp1251']:
        try:
            s = raw.decode(enc)
            break
        except (LookupError, UnicodeDecodeError):
            continue
    s = s or raw.decode('utf-8', 'replace')
    s = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', '', s)
    s = re.sub(r'(?i)<br\s*/?>|</p>|</div>|</tr>|</li>|</h\d>|</td>|</th>', '\n', s)
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = re.sub(r'[ \t\xa0]+', ' ', s)
    return re.sub(r'\n\s*\n+', '\n', s).strip()


def docx_to_text(raw: bytes) -> str:
    z = zipfile.ZipFile(io.BytesIO(raw))
    x = z.read('word/document.xml').decode('utf-8')
    out = []
    for p in re.findall(r'<w:p[ >].*?</w:p>', x, flags=re.S):
        t = ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))
        if t.strip():
            out.append(html.unescape(t))
    return '\n'.join(out)


def pdf_to_text(raw: bytes) -> str:
    import shutil
    import subprocess
    import tempfile
    if shutil.which('pdftotext'):
        with tempfile.TemporaryDirectory() as d:
            f = Path(d) / 'doc.pdf'
            f.write_bytes(raw)
            subprocess.run(['pdftotext', '-enc', 'UTF-8', str(f), str(Path(d) / 'doc.txt')], check=True)
            t = (Path(d) / 'doc.txt').read_text(encoding='utf-8', errors='replace').replace('\f', '\n')
            return re.sub(r'\xad\s*', '', t)  # мягкие переносы из распознанного скана: «на-\n пряжений» -> «напряжений»
    try:
        from pypdf import PdfReader  # pip install pypdf
    except ImportError:
        raise SystemExit('Для PDF нужен пакет pypdf: pip install pypdf')
    import logging
    logging.disable(logging.WARNING)
    return '\n'.join((p.extract_text() or '') for p in PdfReader(io.BytesIO(raw)).pages)


def fetch(only=None):
    TEXT.mkdir(parents=True, exist_ok=True)
    for key, d in DOCS.items():
        if only and key not in only:
            continue
        parts = []
        for url in d['src']:
            print('скачиваю', url)
            raw = get(url)
            parts.append(docx_to_text(raw) if url.endswith('.docx') else pdf_to_text(raw) if url.endswith('.pdf') else html_to_text(raw))
        (TEXT / d['file']).write_text(f"# {d['title']}\n# Источники: {', '.join(d['src'])}\n" + '\n'.join(parts), encoding='utf-8', newline='\n')
        print(f'  {key}: {sum(len(p) for p in parts)} символов')


# начало пункта: ПУЭ — «2.1.56.», ПОТЭЭ — «19.5.», СП — «15.25 » или «5.5.11.5 », приложения СП — «А.1.7 »
CLAUSE = {
    'ПУЭ': re.compile(r'^\s*(\d\.\d{1,2}\.\d{1,3})\.\s'),
    'ПОТЭЭ': re.compile(r'^\s*(\d{1,2}\.\d{1,3})\.\s'),
    'СП256': re.compile(r'^\s*([А-ЯA-Z]\.\d+(?:\.\d+)*|\d{1,2}(?:\.\d{1,3}){1,3})\s+(?=[А-ЯA-Z«(])'),
    'ГОСТ12.1.038': re.compile(r'^\s*(\d\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ21.613': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТР21.101': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ31996': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ31565': re.compile(r'^\s*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)\.?\s+(?=[А-Я])'),
    'ГОСТ61008': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.11': re.compile(r'^\s*(701(?:\.\d{1,3}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ32395': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ32397': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.702': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.16': re.compile(r'^\s*([A-DА-Г]?\.?\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60898': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ60269': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ32144': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.701': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.709': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.710': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТ2.721': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.723': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.727': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.728': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.729': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.732': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.755': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ2.756': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){0,3})\.\s+(?=[А-Я])'),
    'ГОСТ21.210': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ГОСТР50462': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,3})\.?\s+(?=[А-Я])'),
    'ФЗ184': re.compile(r'^\s*Статья\s+(\d+(?:\.\d+)?)\.\s'),
    'ФЗ162': re.compile(r'^\s*Статья\s+(\d+(?:\.\d+)?)\.\s'),
    'ТРТС004': re.compile(r'^\s*Статья\s+(\d+(?:\.\d+)?)\.\s'),
    'ГОСТР50571.4.41': re.compile(r'^\s*([A-ZА-Я]?\.?\d{1,3}(?:\.\d{1,3}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.4.43': re.compile(r'^\s*([A-ZА-Я]?\.?\d{1,3}(?:\.\d{1,3}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.5.52': re.compile(r'^\s*([A-ZА-Я]?\.?\d{1,3}(?:\.\d{1,3}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТР50571.5.54': re.compile(r'^\s*([A-ZА-Я]?\.?\d{1,3}(?:\.\d{1,3}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ1.3': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ1.5': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ61009': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ62423': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60755': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТР70646.1': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ61439.1': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ61439.3': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ22483': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60947.1': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60947.2': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60947.3': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ60947.4.1': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ14254': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТР58698': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ29322': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ61643': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ12.1.030': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
    'ГОСТ12.1.019': re.compile(r'^\s*(\d{1,2}(?:\.\d{1,2}){1,4})\.?\s+(?=[А-Я])'),
}
TABLE = re.compile(r'^\s*Таблица\s+(?:№\s*)?([\d.А-Я]+?)\.?(?:\s|$)')
# в текстах из распознанных PDF и части HTML номер пункта или слово «Таблица» стоят отдельной строкой,
# а буквы бывают разрежены («Т а б л и ц а 54.2») — такие строки склеиваем со следующей
JOIN = {'ГОСТР50571.4.41', 'ГОСТР50571.4.43', 'ГОСТР50571.5.52', 'ГОСТР50571.5.54', 'ГОСТ61439.1', 'ГОСТ60947.1', 'ГОСТ62423', 'ГОСТ29322'}
SPACED = re.compile(r'Т\s?а\s?б\s?л\s?и\s?ц\s?а')


def join_lines(lines):
    out, i = [], 0
    while i < len(lines):
        ln = SPACED.sub('Таблица', lines[i])
        st = ln.strip()
        if re.fullmatch(r'(Таблица|[A-ZА-Я]?\.?\d{1,3}(?:\.\d{1,3}){1,4})', st):
            j = i + 1
            while j < len(lines) and not lines[j].strip():
                j += 1
            if j < len(lines):
                out.append(st + ' ' + SPACED.sub('Таблица', lines[j]).strip())
                i = j + 1
                continue
        out.append(ln)
        i += 1
    return out


def index():
    idx = {}
    for key, d in DOCS.items():
        f = TEXT / d['file']
        if not f.exists():
            print('нет текста', f, '— выполни fetch')
            continue
        lines = f.read_text(encoding='utf-8').split('\n')
        if key in JOIN:
            lines = join_lines(lines)
        cl = {}

        def put(k, buf):
            if k:
                txt = ' '.join(x.strip() for x in buf).strip()
                if k not in cl or len(txt) > len(cl[k]):  # при повторе номера (6-е и 7-е изд.) оставляем более полный
                    cl[k] = txt[:6000]
        # пункт продолжается до следующего пункта (таблица внутри пункта его не обрывает);
        # таблица хранится ещё и отдельно — до следующего пункта или таблицы, не длиннее 80 строк
        ccur, cbuf, tcur, tbuf = None, [], None, []
        for ln in lines:
            m = CLAUSE[key].match(ln)
            t = TABLE.match(ln)
            if m:
                put(ccur, cbuf); put(tcur, tbuf)
                ccur, cbuf, tcur, tbuf = m.group(1), [ln], None, []
            elif t:
                put(tcur, tbuf)
                tcur, tbuf = 'табл. ' + t.group(1), [ln]
                if ccur:
                    cbuf.append(ln)
            else:
                if ccur and len(cbuf) < 400:
                    cbuf.append(ln)
                if tcur:
                    tbuf.append(ln)
                    if len(tbuf) > 80:
                        put(tcur, tbuf); tcur = None
        put(ccur, cbuf); put(tcur, tbuf)
        if key == 'ПОТЭЭ':  # приложение 1 (группы) — одним блоком
            txt = f.read_text(encoding='utf-8')
            i = txt.find('ГРУППЫ ПО ЭЛЕКТРОБЕЗОПАСНОСТИ ЭЛЕКТРОТЕХНИЧЕСКОГО')
            if i >= 0:
                cl['прил. 1'] = re.sub(r'\s+', ' ', txt[i:i + 6000])
        idx[key] = cl
        print(f'{key}: {len(cl)} пунктов и таблиц')
    (HERE / 'index.json').write_text(json.dumps(idx, ensure_ascii=False), encoding='utf-8', newline='\n')


def load():
    p = HERE / 'index.json'
    if not p.exists():
        index()
    return json.loads(p.read_text(encoding='utf-8'))


def norm_doc(s: str) -> str:
    k = s.replace(' ', '').upper().replace('Ё', 'Е')
    for a, b in ALIASES.items():
        if k.startswith(a.upper()):
            return b
    raise SystemExit(f'Неизвестный документ: {s}. Есть: {", ".join(DOCS)}')


def main(argv):
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(__doc__)
        return
    cmd = argv[0]
    if cmd == 'fetch':
        fetch([norm_doc(a) for a in argv[1:]] or None); index(); return
    if cmd == 'index':
        index(); return
    idx = load()
    if cmd == 'list':
        for k, d in DOCS.items():
            print(f'{k:14} {len(idx.get(k, {})):5} пунктов  {d["title"]}')
        return
    if cmd == 'show':
        doc = norm_doc(argv[1])
        q = ' '.join(argv[2:]).replace('пп.', '').replace('п.', '').strip()
        if re.match(r'^табл', q):
            ids = ['табл. ' + re.sub(r'^табл(ица)?\.?\s*№?\s*', '', q)]
        else:
            ids = [x for x in re.split(r'[,\s]+', q) if x]
        for one in ids:
            t = idx.get(doc, {}).get(one)
            print(f'--- {doc} {one} ---')
            print(t if t else 'НЕ НАЙДЕН (проверь номер или выполни fetch)')
        return
    if cmd == 'grep':
        doc = norm_doc(argv[1])
        rx = re.compile(argv[2], re.I)
        n = 0
        for k, t in idx.get(doc, {}).items():
            if rx.search(t):
                n += 1
                m = rx.search(t)
                a = max(0, m.start() - 120)
                print(f'{doc} {k}: …{t[a:m.end() + 160]}…')
        print(f'найдено: {n}')
        return
    print(__doc__)


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main(sys.argv[1:])
