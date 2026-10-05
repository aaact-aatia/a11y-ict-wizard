const async = require('async');
const mongoose = require('mongoose');
const fs = require("fs");
const mammoth = require("mammoth");
const { JSDOM } = require('jsdom');
const innertext = require('innertext');

const Clause = require('../models/clauseSchema');
const Question = require('../models/questionSchema.js');

const strings = {
  listTitle: 'Edit clauses',
  createTitle: 'Create clause',
  clauseNameRequired: 'Clause name required',
  clauseNumberRequired: 'Clause number required',
  deleteClause: 'Delete clause',
  editClause: 'Edit clause',
  clauseNotFound: 'Clause not found',
  updateClause: 'Update clause',
  clauseloader: 'bulk clause loader'
}

const mammothStyleMap = [
  "u => u",
  "p[style-name='List Number'] => ol[class='alpha-paren-list'] > li:fresh",
  "p[style-name='List Number 2'] => ol[class='alpha-paren-list'] > li:fresh",
  "p[style-name='List Number 3'] => ol[class='alpha-paren-list'] > li:fresh",
  "p[style-name='List Alpha'] => ol[class='alpha-paren-list'] > li:fresh",
  "p[style-name='List Alpha 2'] => ol[class='alpha-paren-list upper-alpha'] > li:fresh",
  "p[style-name='List Bullet'] => ul > li:fresh"
];

function normalizeOrderedListMarkers(containerElement) {
  const orderedLists = Array.from(containerElement.querySelectorAll('ol'));

  orderedLists.forEach((orderedList) => {
    const isUppercase = orderedList.classList.contains('upper-alpha') || orderedList.getAttribute('type') === 'A';
    const listItems = Array.from(orderedList.children).filter((child) => child.tagName === 'LI');

    orderedList.setAttribute('type', isUppercase ? 'A' : 'a');
    orderedList.setAttribute('style', 'padding-left: 1.8em; margin-left: 0; margin-top: 0; margin-bottom: 0; list-style-type: lower-alpha;');

    if (isUppercase) {
      orderedList.style.listStyleType = 'upper-alpha';
    }

    listItems.forEach((listItem) => {
      const existingMarker = listItem.querySelector(':scope > span[data-alpha-marker="true"]');
      if (existingMarker) {
        existingMarker.remove();
      }

      listItem.setAttribute('style', 'margin-left: 0;');
    });
  });
}

exports.clause_json_restore_post = (req, res, next) => {
  console.log("In server. Form data");
  const JavaClauseFile = req.body;

  function convertToMongoFormat(javaContent) {
    try {
      return javaContent.map(item => {
        if (item._id && item._id.$oid) {
          let clauseOID = item._id.$oid
          item._id = mongoose.Types.ObjectId(clauseOID);
        }
      });
    } catch (err) {
      console.log('Error in convertToMongoFormat:', err);
      throw err;
    }
  }

  const formattedData = convertToMongoFormat(JavaClauseFile);

  // Function to update MongoDB collection
  async function updateClauseCollection() {

    try {
      await Clause.deleteMany({});
      await Clause.insertMany(JavaClauseFile);

      return true;
    } catch (err) {
      console.log('Error updating data:', err);
    }
  }

  updateClauseCollection()
    .then(() => res.json({ message: 'Data updated successfully. Please note that when you close this modal the page will refresh to show the updated data.', success: true }))
    .catch((err) => res.status(500).json({ message: 'Error updating data.', success: false }));
}

exports.clause_json_get = (req, res, next) => {

  Clause.find()
    .sort([['number', 'ascending']])
    .lean()
    .exec((err, clauses) => {
      if (err) {
        return next(err);
      }

      const transformedClauses = clauses.map(clause => {
        clause._id = { "$oid": clause._id.toString() };

        return clause;
      });

      const clausesData = JSON.stringify(transformedClauses, null, 2);

      // Send the data as a downloadable file
      res.setHeader('Content-disposition', 'attachment; filename=clauses_list.json');
      res.send(clausesData);
    });
};

// Display list of all Clauses
exports.clause_list = (req, res, next) => {
  Clause.find()
    .exec((err, list_clauses) => {
      if (err) { return next(err); }
      list_clauses = list_clauses.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
      res.render('clause_list', {
        title: strings.listTitle,
        clause_list: list_clauses,
        breadcrumbs: [
          { url: '/', text: 'Home' },
          { url: '/edit', text: 'Edit content' }
        ]
      });
    });
};

// Display clause create form on GET
exports.clause_create_get = (req, res, next) => {
  res.render('clause_form', {
    title: strings.createTitle,
    breadcrumbs: [
      { url: '/', text: 'Home' },
      { url: '/edit', text: 'Edit content' },
      { url: '/edit/clauses', text: 'Edit clauses' }
    ]
  });
};

// Handle Clause create on POST
exports.clause_create_post = (req, res, next) => {

  let clause = new Clause({
    number: req.body.number,
    name: req.body.name,
    frName: req.body.frName,
    informative: req.body.informative === 'on',
    description: req.body.description,
    frDescription: req.body.frDescription,
    compliance: req.body.compliance,
    frCompliance: req.body.frCompliance
  });

  // Check if Clause with same name already exists.
  Clause.findOne({ 'number': req.body.number }).exec((err, found_clause) => {
    if (err) { return next(err); }
    if (found_clause) {
      // Clause exists, redirect to its detail page.
      res.redirect(found_clause.url);
    } else {
      clause.save((err) => {
        if (err) { return next(err); }
        // Clause saved. Redirect to clause list.
        res.redirect('/edit/clauses');
      });
    }
  });
};

// Display clause update form on GET
exports.clause_update_get = (req, res, next) => {

  // Get clause for form
  async.parallel({
    clause: (callback) => Clause.findById(req.params.id).exec(callback)
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.clause == null) { // No results
      let err = new Error(strings.clauseNotFound);
      err.status = 404;
      return next(err);
    }
    // Success.
    res.render('clause_form', {
      title: strings.editClause,
      item: results.clause,
      breadcrumbs: [
        { url: '/', text: 'Home' },
        { url: '/edit', text: 'Edit content' },
        { url: '/edit/clauses', text: 'Edit clauses' }
      ]
    });
  });
};

// Handle clause update on POST.
exports.clause_update_post = (req, res, next) => {

  // Create a clause object with old id.
  let clause = new Clause({
    number: req.body.number,
    name: req.body.name,
    frName: req.body.frName,
    informative: req.body.informative === 'on',
    description: req.body.description,
    frDescription: req.body.frDescription,
    compliance: req.body.compliance,
    frCompliance: req.body.frCompliance,
    weight: req.body.weight,
    _id: req.params.id // This is required, or a new ID will be assigned
  });

  Clause.findByIdAndUpdate(req.params.id, clause, {}, (err, theclause) => {
    if (err) { return next(err); }
    res.redirect('/edit/clauses'); // Success: redirect to clause list.
  });
};

// Display Clause delete form on GET.
exports.clause_delete_get = (req, res, next) => {
  async.parallel({
    clause: (callback) => Clause.findById(req.params.id).exec(callback)
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.clause == null) { res.redirect('/edit/clauses'); }
    res.render('item_delete', {
      title: strings.deleteClause,
      item: results.clause,
      breadcrumbs: [
        { url: '/', text: 'Home' },
        { url: '/edit', text: 'Edit content' },
        { url: '/edit/clauses', text: 'Edit clauses' },
        { url: results.clause.url, text: results.clause.name }
      ]
    });
  });
};

// Handle Clause delete on POST.
exports.clause_delete_post = (req, res, next) => {

  async.parallel({
    clause: (callback) =>
      Clause.findById(req.body.itemid).exec(callback),
    clause_questions: (callback) =>
      Question.find({ clauses: req.body.itemid }).exec(callback)
  }, (err, results) => {
    if (err) { return next(err); }
    if (results.clause_questions.length > 0) {
      // Clause has questions referencing it which must be deleted first
      res.render('item_delete', {
        title: strings.deleteClause,
        item: results.clause,
        dependencies: results.clause_questions,
        breadcrumbs: [
          { url: '/', text: 'Home' },
          { url: '/edit', text: 'Edit content' },
          { url: '/edit/clauses', text: 'Edit clauses' },
          { url: results.clause.url, text: results.clause.name }
        ]
      });
      return;
    }

    // Delete object and redirect to the list of clauses
    Clause.findByIdAndRemove(req.body.itemid, (err) => {
      if (err) { return next(err); }
      res.redirect('/edit/clauses'); // Success - go to clause list
    })
  });
};

// Display clause loader form on GET
exports.clause_loader_get = (req, res, next) => {
  res.render('clause_loader', {
    title: strings.clauseloader,
    breadcrumbs: [
      { url: '/', text: 'Home' },
      { url: '/edit', text: 'Edit content' },
      { url: '/edit/clause_loader', text: 'Bulk clause loader' }
    ]
  });
};


function addNoteIndents(description) {
  if (!description) return description;

  const dom = new JSDOM(`<div>${description}</div>`);
  const container = dom.window.document.querySelector('div');
<<<<<<< Updated upstream
  const notePattern = /^NOTE(?: [1-9])?:/;
  const notePatternDouble = /^NOTE [1-9][0-9]:/;
  const notePatternFR = /^REMARQUE\s*:/;
  const notePatternSingleFR = /^REMARQUE\s+[1-9]\s*[\u00A0 ]:/;
  const notePatternDoubleFR = /^REMARQUE\s+[1-9][0-9]\s*[\u00A0 ]:/;
const examplePattern = /^EXAMPLE:/;
const examplePatternFR = /^EXEMPLE[\u00A0 ]:/;

    function applyIndent(paragraph, marginLeft, textIndent) {
      paragraph.setAttribute('style', `margin-left: ${marginLeft}em; text-indent: ${textIndent}em;`);
      const colonIndex = paragraph.innerHTML.indexOf(':');
      paragraph.innerHTML = paragraph.innerHTML.substring(0, colonIndex + 1)
        + '<span style="mso-tab-count: 1;"> </span>'
        + paragraph.innerHTML.substring(colonIndex + 2);
    }

  Array.from(container.querySelectorAll('p')).forEach((paragraph) => {
    // the NOTE: and NOTE #: case
    if (notePattern.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 5.75, -4.25);
    }
    // the NOTE##: case
    else if (notePatternDouble.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 6.24, -4.74);
    }
    // the REMARQUE : case
    else if (notePatternFR.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 8.16, -6.66);
    }
    // REMARQUE # : case 
      else if (notePatternSingleFR.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 8.88, -7.38);
    }
      // REMARQUE ## : case 
      else if (notePatternDoubleFR.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 9.66, -8.16);
    }
      else if (examplePattern.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 7.02, -5.52);
    }
    else if (examplePatternFR.test(paragraph.textContent.trimStart())) {
        applyIndent(paragraph, 7.02, -5.52);
    }
  });
=======
  const notePatterSsingle = /^NOTE(?: [1-9])?:/;
  const notePatternDouble = /^NOTE [1-9][0-9]:/;
  const notePatternSingleFR = /^REMARQUE (?: [1-9])? :/;
  const notePatternDoubleFR = /^REMARQUE [1-9][0-9] :/;

  Array.from(container.querySelectorAll('p')).forEach((paragraph) => {
    const paragraphText = paragraph.textContent.trimStart();
    // NOTE: and NOTE#: cases 
    if (notePatternSingle.test(paragraphText)) {
    paragraph.setAttribute('style', 'margin-left: 5.75em; text-indent: -4.25em;');
    const colonIndex = paragraph.innerHTML.indexOf(':');
    paragraph.innerHTML = paragraph.innerHTML.substring(0, colonIndex + 1)
      + '<span style="mso-tab-count: 1;"> </span>'
      + paragraph.innerHTML.substring(colonIndex + 2);
}
// NOTE ##: case
else if (notePatternDouble.test(paragraphText)) {
    paragraph.setAttribute('style', 'margin-left: 6.75em; text-indent: -5.25em;');
    const colonIndex = paragraph.innerHTML.indexOf(':');
    paragraph.innerHTML = paragraph.innerHTML.substring(0, colonIndex + 1)
      + '<span style="mso-tab-count: 1;"> </span>'
      + paragraph.innerHTML.substring(colonIndex + 2);
}
// REMARQUE  : or REMARQUE  # :      case
else if (notePatternSingleFR.test(paragraphText)) {
    paragraph.setAttribute('style', 'margin-left: 7.75em; text-indent: -6.25em;');
    const colonIndex = paragraph.innerHTML.indexOf(':');
    paragraph.innerHTML = paragraph.innerHTML.substring(0, colonIndex + 1)
      + '<span style="mso-tab-count: 1;"> </span>'
      + paragraph.innerHTML.substring(colonIndex + 2);
}
// REMARQUE ## case
else if (notePatterndoubleFR.test(paragraphText)) {
    paragraph.setAttribute('style', 'margin-left: 7.75em; text-indent: -6.25em;');
    const colonIndex = paragraph.innerHTML.indexOf(':');
    paragraph.innerHTML = paragraph.innerHTML.substring(0, colonIndex + 1)
      + '<span style="mso-tab-count: 1;"> </span>'
      + paragraph.innerHTML.substring(colonIndex + 2);
}
  });
console.log(container.innerHTML)
>>>>>>> Stashed changes
  return container.innerHTML;
}


async function updateFromWordFiles(englishFile, frenchFile) {
  // If either file is missing, skip processing for that language
  let englishRows = [];
  let frenchRows = [];

  // Helper to extract rows from a table element
  function extractRows(tableElement) {
    if (!tableElement) return [];
    const rows = Array.from(tableElement.querySelectorAll("tr"));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll("td"));
      if (cells.length === 0) return null;
      const htmlBlob = cells[0].innerHTML;

      // Create a temporary DOM to parse the HTML blob
      const tempDiv = tableElement.ownerDocument.createElement('div');
      tempDiv.innerHTML = htmlBlob;
      normalizeOrderedListMarkers(tempDiv);
      let number = '', name = '', description = '', compliance = '';

      const firstChild = tempDiv.firstChild;
      const firstLine = firstChild && firstChild.textContent ? firstChild.textContent.trim() : '';
      const spaceId = firstLine.indexOf(' ');
      if (spaceId > 0) {
        number = firstLine.substring(0, spaceId).trim();
        name = firstLine.substring(spaceId + 1).trim();
      }
      const children = tempDiv.childNodes;
      let relationshipToFPCFound = false;
      for (let i = 1; i < children.length; i++) {
        const text = children[i].textContent || '';
        if (text.startsWith("Relationship between requirements and functional performance ") || text.startsWith("Relation entre les exigences et les critères de rendement fonctionnel")) {
          relationshipToFPCFound = true;
          continue;
        }
        if (!relationshipToFPCFound) {
          description += children[i].outerHTML;
        } else {
          compliance += children[i].outerHTML;
        }
      }

      description = addNoteIndents(description);
      return { number, name, description, compliance };
    }).filter(Boolean);
  }

  // Process English file if provided
  if (englishFile) {
    const englishHtmlResult = await mammoth.convertToHtml({ buffer: englishFile.buffer }, {
      includeDefaultStyleMap: true,
      styleMap: mammothStyleMap,
      preserveEmptyParagraphs: false
    });
    const englishHtml = englishHtmlResult.value;
    const englishDom = new JSDOM(englishHtml);
    const englishTable = englishDom.window.document.querySelectorAll("table")[1];
    englishRows = extractRows(englishTable);
  }

  // Process French file if provided
  if (frenchFile) {
    const frenchHtmlResult = await mammoth.convertToHtml({ buffer: frenchFile.buffer }, {
      includeDefaultStyleMap: true,
      styleMap: mammothStyleMap,
      preserveEmptyParagraphs: false
    });
    const frenchHtml = frenchHtmlResult.value;
    const frenchDom = new JSDOM(frenchHtml);
    const frenchTable = frenchDom.window.document.querySelectorAll("table")[1];
    frenchRows = extractRows(frenchTable);
    // Map frenchRows to rename fields as required
    frenchRows = frenchRows.map(row => ({
      number: row.number,
      frName: row.name,
      frDescription: row.description,
      frCompliance: row.compliance
    }));
  }

  // Apply updates for whichever rows were found
  if (englishRows.length > 0) await updateData(englishRows);
  if (frenchRows.length > 0) await updateData(frenchRows);
  return { englishRows, frenchRows };
}

// handle the post for clause loader. This is where the file is recieved and processed.
exports.clause_loader_post = async (req, res, next) => {
  const files = req.files;
  if (!files || (!files.englishfile && !files.frenchfile)) {
    return res.status(400).send('At least one file is required');
  }
  const englishFile = files.englishfile ? files.englishfile[0] : null;
  const frenchFile = files.frenchfile ? files.frenchfile[0] : null;
  if (englishFile) console.log('English file:', englishFile.originalname, 'size:', englishFile.size);
  if (frenchFile) console.log('French file:', frenchFile.originalname, 'size:', frenchFile.size);

  try {
    await updateFromWordFiles(englishFile, frenchFile);
    res.send('Files uploaded and processed successfully.');
  } catch (err) {
    next(err);
  }
}

async function updateData(rows) {
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (!row.number) continue;
    // Find and update the clause by number
    await Clause.findOneAndUpdate(
      { number: row.number },
      { $set: row},
      { new: true }
    ).exec();
  }
}
