
function renderTable(e) {
    const data = e.data;
    const signals = data.signals;
    const words = data.words;
    let table = '<table>';
    table += '<tr>' +
        '<th>N</th><th>Group</th>' +
        '<th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th>' +
        '</tr>';
    if (!signals) { return; }
    // TODO: merge with words
    let sk = keys(signals);
    let wk = keys(words);
    let k = sk.concat(wk).sort((a, b) => a -b);
    for (let p of k) {
        // pocket number
        table += '<tr><th rowspan="4">' + p + '</th>';
        // groups
        for (let g = 0; g < 4; g++) {
            let s = 0; // symbol number
            if (g !== 0) { table += '<tr>'; }
            table += '<th>'+ data.pocket + g + '</th>';
            for (let i = 0; i < 8; i++) {
                s = g * 8 + i;
                let x = signals[p]?.includes(s) ? 'x' : '';
                let style = words[p]?.includes(g) ? 'style="background: #1a8fa97a;"' : '';
                table += '<th title=' + s + ' ' + style + '>' + x + '</th>';
            }
            table += '</tr>';
        }
    }
    table += '</table>';
    let pocket = document.getElementById('signals');
    pocket.innerHTML = table;
}

function keys(obj) {
    let k = new Array();
    for (p in obj) {
        try {
            k.push(parseInt(p));
        } catch (error) {
            console.error(error);
        }
    }
    return k;
}

window.addEventListener('message', renderTable);
