// default render callback
export function renderPage(pageData) {
  //check documents https://mozilla.github.io/pdf.js/
  let render_options = {
    //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
    normalizeWhitespace: false,
    //do not attempt to combine same line TextItem's. The default value is `false`.
    disableCombineTextItems: false,
  };

  return pageData.getTextContent(render_options).then(function (textContent) {
    let lastX,
      lastY,
      text = '';
    for (let item of textContent.items) {
      if (lastY == item.transform[5] || !lastY) {
        text += item.str;
      } else {
        if (lastX != item.transform[4]) {
          text += '---newsection---';
        }
        text += '\n' + item.str;
      }
      lastY = item.transform[5];
      lastX = item.transform[4];
    }
    return text;
  });
}
