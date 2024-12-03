const API_KEY = 'AIzaSyDg6FBho-vfAm67-UdGP-8IbVFdLV23unY'
function loadClient() {
    gapi.client.setApiKey(API_KEY);
    return gapi.client.load("https://sheets.googleapis.com/$discovery/rest?version=v4")
        .then(() => {
            console.log("GAPI client loaded for API");
            fetchAllData()
        }, (err) => console.error("Error loading GAPI client for API", err));
}
function fetchAllData() {
    categories.forEach((category, categoryIndex) => {
        if (gameID == 'cuphead') {
            fetchCuphead(category, categoryIndex)
        } else {
            fetchTetris(category, categoryIndex)
        }

    })
}
function fetchTetris(category, categoryIndex) {
    return gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'${category.tabName}'!${category.range}`
    }).then(response => {
        const values = response.result.values;
        categories[categoryIndex].runs = {}
        const headers = values[0];
        let data = values.slice(1);
        let lastIndex = data.length
        data.forEach((run, runIndex) => {
            if (!run[0].trim()) {
                lastIndex = runIndex
            }
        })
        data = data.slice(0, lastIndex)
        const objects = data.map(row => {
            const rowObject = {};
            headers.forEach((header, index) => {
                if (!header.trim()) {
                    rowObject['place'] = row[index] || null;
                } else if (header == 'Name') {
                    const player = { name: row[index] }
                    rowObject.player = player || null;
                    addPlayer(player)
                } else {
                    if (header == 'Video PB') {
                        header = 'score'
                    }
                    rowObject[header.toLowerCase()] = row[index] || null;
                }
            });
            return rowObject;
        });
        categories[categoryIndex].runs = objects
        load(categories)
        if (processedCategories == categories.length) {
            prepareData()
            const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID
            const boardTitleSrc = document.getElementById('boardTitleSrc')
            boardTitleSrc.innerHTML = `<div onclick="${openLink(url)}" class='clickable'><img src='images/source/sheets.png'></div>`
        }
    }, (err) => console.error("Execute error", err));
}
function fetchCuphead(category) {
    return gapi.client.sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        ranges: [`'${category.tabName}'!${category.range}`],
        fields: 'sheets(data(rowData(values(userEnteredValue,textFormatRuns))))'
    }).then(response => {
        const values = response.result.sheets[0].data[0].rowData;
        if (gameID == 'tetris') {

        } else {
            categories = []
            bossesCopy = [...bosses]
            if (fullgameILsCategory.name == 'DLC') {
                bossesCopy = bossesCopy.slice(19, 25)
            } else if (fullgameILsCategory.name != 'DLC+Base') {
                bossesCopy = bossesCopy.slice(0, 19)
            }
            bossesCopy.sort((a, b) => (a.order || 0) - (b.order || 0));
            if (fullgameILsCategory.name == 'DLC+Base') {
                let elementsToMove = bossesCopy.slice(0, 6);
                bossesCopy.splice(0, 6);
                bossesCopy.splice(8, 0, ...elementsToMove);
                let elem = bossesCopy.splice(2, 1)[0];
                bossesCopy.unshift(elem);
            }
            bossesCopy.forEach(boss => {
                categories.push({ name: boss.name, info: boss, runs: [] })
            })
            categories.forEach((category, categoryIndex) => {
                if (values[categoryIndex].values) {
                    if (values[categoryIndex].values[0]) {
                        const rawTime = values[categoryIndex].values[0].userEnteredValue?.numberValue
                        const time = convertToSeconds(secondsToHMS(Math.round(rawTime * 24 * 60)))
                        values[categoryIndex].values.slice(1).forEach(column => {
                            let playerName = column.userEnteredValue.formulaValue.split(',')[1].slice(2).split('"')[0]
                            const link = column.userEnteredValue.formulaValue.slice(12).split('"')[0]
                            let debug = false
                            if (playerName.startsWith("*")) {
                                playerName = playerName.slice(1);
                                debug = true
                            }
                            addPlayer({ name: playerName })
                            category.runs.push({ place: 1, debug: debug, player: { name: playerName }, score: time, date: category.runs.length, videos: { links: [{ uri: link }] } })
                        })
                    }
                }
            })
        }
        load(categories)
        prepareData(categories)
        gapi.client.sheets.spreadsheets.get({
            spreadsheetId: SHEET_ID
        }).then(response => {
            const sheets = response.result.sheets;
            const tabMap = {};
            sheets.forEach(sheet => {
                const name = sheet.properties.title;
                const gid = sheet.properties.sheetId;
                tabMap[name] = gid;
            });
            const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit?gid=' + tabMap[fullgameILsCategory.tabName]
            const boardTitleSrc = document.getElementById('boardTitleSrc')
            boardTitleSrc.innerHTML = `<div onclick="${openLink(url)}" class='clickable'><img src='images/source/sheets.png'></div>`
            boardTitleSrc.innerHTML += `<div style='margin-left:5px' onclick="${openLink('https://www.speedrun.com/cuphead')}" class='clickable'><img src='images/social/speedrun.png'></div>`
        });
    }, (err) => console.error("Execute error", err));
}