function renderTable(data, timers = false){
    console.log('render table', data);
    let table = '<table>';
    let rows = 10;
    if (timers) {rows = 26}
    // header
    table += '<tr><th>N</th><th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th><th>8</th><th>9</th></tr>';
    for (let r = 0; r < rows; r++) {
        //rows
        table += '<tr><th>' + r + '</th>';
        for (let c = 0; c < 10; c++) {
            // columns
            let num  = r * 10 + c;
            if (num >= 48 && num <=63  && timers) {
                table += '<th style="background: #306a7752;">';
            } else {
                table += '<th>';
            }
            if (data.includes((r * 10 + c))) {
                    table += 'X</th>';
            } else {
                table += '</th>';
            }
        }
        table += '</tr>';
    }
    table += '</table>';
    return table;
}

function renderData(e) {
    const data = e.data;
    console.log("data received ", data);
    const timer = document.getElementById("timers");
    let tableStr = '<h2>Timers</h2>';
    if (data.timers) {tableStr += renderTable(data.timers, true);}
    timer.innerHTML = tableStr;
    const counter = document.getElementById("counters");
    tableStr = '<h2>Counters</h2>';
    if (data.counters) {tableStr += renderTable(data.counters);}
    counter.innerHTML = tableStr;
    const pulses = document.getElementById("pulses");
    tableStr = '<h2>Pulses</h2>';
    if (data.pulses) {tableStr += renderTable(data.pulses);}
    pulses.innerHTML = tableStr;
}

window.addEventListener('message', renderData);