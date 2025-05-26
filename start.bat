del /s /q "%~dp0output\*.*"
node index.js fetch -p henry1266_pharmacy-pos -o issues_full
node src/filter_open_issues.js