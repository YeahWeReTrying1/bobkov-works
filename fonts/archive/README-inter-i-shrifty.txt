Архив прежних настроек шрифта (до перехода на Google Sans).

Раньше в src/app/globals.css для html и body задавалось:
  font-family: Inter, Arial, sans-serif;

Inter в репозитории не подключался отдельными файлами — только через этот fallback-стек.
Чтобы вернуться: удалите импорты Google Sans из src/app/layout.tsx и восстановите правило
font-family в globals.css как в этом файле.
