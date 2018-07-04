$('[data-toggle="tooltip"]').tooltip().on("mouseleave", function() {
    $(this).tooltip("hide")
})

var e = new ClipboardJS('.btn-clipboard');
e.on('success', function(e) {
    $(e.trigger).attr("title", "복사됨!").tooltip("_fixTitle").tooltip("show").attr("title", "클립보드로 복사").tooltip("_fixTitle");
    e.clearSelection();
});
e.on('error', function(e) {
    var t = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl-";
    var n = "Press " + t + "C to copy";
    $(e.trigger).attr("title", n).tooltip("_fixTitle").tooltip("show").attr("title", "클립보드로 복사").tooltip("_fixTitle")
});

// Check IE
var agent = navigator.userAgent.toLowerCase();
if ( (navigator.appName == 'Netscape' && agent.indexOf('trident') != -1) || (agent.indexOf("msie") != -1)) {
    alert('Internet Explorer 는 지원하지 않습니다.');
}

var sampleDs = 
    "<Dataset DataSetType=\"Dataset\" Id=\"Dataset0\">\n"+
    "	<Contents>\n"+
    "		<colinfo id=\"column0\" size=\"256\" summ=\"default\" type=\"STRING\"/>\n"+
    "		<colinfo id=\"column1\" size=\"256\" summ=\"default\" type=\"STRING\"/>\n"+
    "		<colinfo id=\"column2\" size=\"256\" summ=\"default\" type=\"STRING\"/>\n"+
    "		<record>\n"+
    "			<column0>1</column0>\n"+
    "			<column1>2</column1>\n"+
    "			<column2>3</column2>\n"+
    "		</record>\n"+
    "		<record>\n"+
    "			<column0>A</column0>\n"+
    "			<column1>B</column1>\n"+
    "			<column2>C</column2>\n"+
    "		</record>\n"+
    "		<record>\n"+
    "			<column0>가</column0>\n"+
    "			<column1>나</column1>\n"+
    "			<column2></column2>\n"+
    "		</record>\n"+
    "	</Contents>\n"+
    "</Dataset>";
$('#miplatformDataset').val(sampleDs);

$('.btn-convert').on('click', function(event) {
    var xmlDoc = new DOMParser().parseFromString($("#miplatformDataset").val(), "text/xml");
    var dsNodes = xmlDoc.getElementsByTagName("Dataset");
    if(!dsNodes || dsNodes.length === 0) {
        swal(
            '실패',
            'MiPlatform Dataset XML 이 올바른지 확인해 주세요.',
            'error'
        );
        return;
    }
    var strBuffer = "";
    for (var i = 0; i < dsNodes.length; i++) {
        var dsObj = parseDataset(dsNodes[i]);
        strBuffer += convertDataset(dsObj) + '\n';
    };
    $("#nexacroDataset").val(strBuffer);
    swal(
        '성공!!!',
        'Nexacro Dataset 변환이 성공하였습니다.',
        'success'
    )
});

// Nexacro Dataset attribute name map
var dsAttrMap = {
    argument : 'arguments', 
    cancolumnchange  : 'cancolumnchange', 
    canrowposchange : 'canrowposchange', 
    filterexpr : 'filterstr', 
    firefirstcount : 'firefirstcount', 
    firenextcount : 'firenextcount', 
    id : 'id', 
    oncolumnchanged : 'oncolumnchanged', 
    onloadcompleted : 'onload', 
    onrowposchanged : 'onrowposchanged', 
    reversesubsum : 'reversesubsum', 
    servicedsetid  : 'serverdatasetid', 
}
/**
 * Dataset Object 를 Nexacro Dataset XML 로 변환
 */
function convertDataset(dsObj) {
    var xmlString = "<root></root>";
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlString, "text/xml");

    //Dataset
    var dsNode = xmlDoc.createElement("Dataset");
    for (var name in dsObj) {
        if(dsAttrMap.hasOwnProperty(name)) {
            dsNode.setAttribute(dsAttrMap[name], dsObj[name]);
        }
    }            
    var colinfoNode = xmlDoc.createElement("ColumnInfo");
    dsNode.appendChild(colinfoNode);
    var rowsNode = xmlDoc.createElement("Rows");
    dsNode.appendChild(rowsNode);

	//ConstColumn
	for (var i = 0; i < dsObj.constcols.length; i++) {
        var colNode = xmlDoc.createElement("ConstColumn");
        var colObj = dsObj.constcols[i];
        colNode.setAttribute("id", colObj["id"]);
		colNode.setAttribute("type", colObj["type"]);
		colNode.setAttribute("size", 255);
		colNode.setAttribute("value", colObj["value"]);
        colinfoNode.appendChild(colNode);
    }
    //ColumnInfo
    for (var i = 0; i < dsObj.columns.length; i++) {
        var colNode = xmlDoc.createElement("Column");
        var colObj = dsObj.columns[i];
        for (var name in colObj) {
            colNode.setAttribute(name, colObj[name]);
        }
        colinfoNode.appendChild(colNode);
    }

    //Rows
    for (var i = 0; i < dsObj.rows.length; i++) {
        var rowNode = xmlDoc.createElement("Row");
        rowsNode.appendChild(rowNode);

        var rowObj = dsObj.rows[i];
        for (var j = 0; j < rowObj.cols.length; j++) {
            var colNode = xmlDoc.createElement("Col");
            rowNode.appendChild(colNode);

            var colObj = rowObj.cols[j];
            colNode.setAttribute("id", colObj.id);
            colNode.textContent = colObj.value;
        }
    }
    xmlDoc.documentElement.appendChild(dsNode);

    return formatXml(xmlDoc.querySelector("root").innerHTML);
}

function formatXml(xml) {
    var formatted = '';
    var reg = /(>)(<)(\/*)/g;
    xml = xml.replace(reg, '$1\r\n$2$3');
    var pad = 0;
    jQuery.each(xml.split('\r\n'), function(index, node) {
        var indent = 0;
        if (node.match(/.+<\/\w[^>]*>$/)) {
            indent = 0;
        } else if (node.match(/^<\/\w/)) {
            if (pad != 0) {
                pad -= 1;
            }
        } else if (node.match(/^<\w[^>]*[^\/]>.*$/)) {
            indent = 1;
        } else {
            indent = 0;
        }

        var padding = '';
        for (var i = 0; i < pad; i++) {
            padding += '  ';
        }

        formatted += padding + node + '\r\n';
        pad += indent;
    });

    return formatted;
}

/**
 * MiPlatform Dataset XML 을 파싱하여 Dataset Object 로 변환
 */
function parseDataset(ds) {
    var dsObj = {
		constcols: [], 
        columns: [],
        rows: []
    };
    var attrs = ds.attributes;
    for (var i = 0; i < attrs.length; i++) {
        dsObj[attrs[i].name.toLowerCase()] = attrs[i].value;
    }

    var constcols = ds.querySelectorAll("Contents > column");
    for (var i = 0; i < constcols.length; i++) {
        dsObj.constcols[i] = parseConstColumn(constcols[i]);
    }

    var cols = ds.querySelectorAll("Contents > colinfo");
    for (var i = 0; i < cols.length; i++) {
        dsObj.columns[i] = parseColumn(cols[i]);
    }

    var records = ds.querySelectorAll("Contents > record");
    for (var i = 0; i < records.length; i++) {
        dsObj.rows[i] = parseRecord(records[i]);
    }
    return dsObj;
}

/**
 * column XML 노드를 constcolumn Object 로 변환
 */
function parseConstColumn(column) {
    var colObj = {};
    var attrs = column.attributes;
	colObj.id = attrs["id"].value;
	colObj.type = attrs["type"].value;
	colObj.value = column.textContent;
    return colObj;
}

/**
 * colinfo XML 노드를 column Object 로 변환
 */
function parseColumn(colinfo) {
    var colObj = {};
    var attrs = colinfo.attributes;
    for (var i = 0; i < attrs.length; i++) {
        colObj[attrs[i].name] = attrs[i].value;
    }
    return colObj;
}

/**
 * record XML 노드를 row Object 로 변환
 */
function parseRecord(record) {
    var rowObj = {
        cols: []
    };
    var nodes = record.children;
    for (var i = 0; i < nodes.length; i++) {
        rowObj.cols[i] = {
            id: nodes[i].nodeName,
            value: nodes[i].textContent
        };
    }
    return rowObj;
}