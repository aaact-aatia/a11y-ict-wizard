// Client side scripts for a11y-req
// NOT FOR WET OVERRIDES

$(document).on("wb-ready.wb", function (event) {

  setupTreeHandler();

  setupWizardHandler();

  setupClauseListHandler();

  updateWizard();

  setupQuestionHandler();

  setupRestoreJSONHandler();

  // Replace <textarea> with rich text editor (CKEditor)
  // https://stackoverflow.com/questions/46559354/how-to-set-the-height-of-ckeditor-5-classic-editor/56550285#56550285
  function MinHeightPlugin(editor) {
    this.editor = editor;
  };

  MinHeightPlugin.prototype.init = function () {
    this.editor.ui.view.editable.extendTemplate({
      attributes: {
        style: {
          maxHeight: '400px'
        }
      }
    });
  };

  ClassicEditor.builtinPlugins.push(MinHeightPlugin);

  $('textarea').each(function () {
    if (!$(this).hasClass('no-editor')) {
      initCK(this, $(this).attr('lang') === 'fr' ? 'fr' : 'en');
    }
  });
});


/* Manual clause list handling */

var setupClauseListHandler = function () {
  // #clauseList is the <textarea> element (see /views/wizard.pug)
  $('#clauseList').change(function () { updateClauseSelections(); });
};

var updateClauseSelections = function () {
  var clauseList = $('#clauseList').val();
  // Uncheck all checkboxes
  $('#clauses input').prop('checked', false);
  // Clean up clause list text
  clauseList = clauseList.replace(/[a-z]|,/gi, '');
  var clauses = clauseList.split(' ');
  // console.log(clauses);
  for (var i = 0; i < clauses.length; i++) {
    var clause = clauses[i];
    if (clause.length < 1) {
      continue;
    }
    if (clause[clause.length - 1] === '.') {
      clause = clause.substr(0, clause.length - 1);
    }
    $('input[data-number="' + clause + '"]').prop('checked', true);
  }

  $('[role="treeitem"]').each(function () {
    updateAriaChecked($(this));
  });

  $('[role="treeitem"]').each(function () {
    updateAriaChecked($(this));
  });
};


/* Tree menu selection */

var setupTreeHandler = function () {
  $('#selectAll').click(function (e) {
    $('#clauses input').prop('checked', true).prop('indeterminate', false);
    $('[role="treeitem"]').attr('aria-checked', true);
    e.preventDefault();
  });
  $('#selectNone').click(function (e) {
    e.preventDefault();
  });
  $('#expandAll').click(function (e) {
    $('li.parentNode').attr('aria-expanded', true);
    $('li.endNode').each(function () {
      toggleClauseText($(this), true, true);
    });
    e.preventDefault();
  });
  $('#expandTree').click(function (e) {
    $('li.parentNode').attr('aria-expanded', true);
    e.preventDefault();
  });
  $('#collapseAll').click(function (e) {
    $('li.parentNode').attr('aria-expanded', false);
    $('li.endNode').each(function () {
      toggleClauseText($(this), false);
    });
    e.preventDefault();
  });
  $('#openClauseList').click(function (e) {
    $('li.parentNode').attr('aria-expanded', true);
    $('li.endNode').each(function () {
      toggleClauseText($(this), true, true);
    });
    e.preventDefault();
  });
};

/* CKEditor */

var initCK = function (element, lang) {
  ClassicEditor
    .create(element, {
      language: {
        ui: 'en',
        content: lang
      },
      removePlugins: [],
      // plugins: [ 'Base64UploadAdapter' ],
      toolbar: ['heading', 'bold', 'italic', 'bulletedList', 'numberedList', 'link', 'undo', 'redo', 'imageUpload', 'imageTextAlternative', 'insertTable']
    })
    .then(function (editor) {
      // console.log(editor);
      // console.log(Array.from(editor.ui.componentFactory.names()));
    })
    .catch(function (error) { console.error(error); });

  // console.log(ClassicEditor.builtinPlugins.map(plugin => plugin.pluginName));
};

/* Wizard questions */

var setupWizardHandler = function () {

  wizardChanged = false;

  $(document).on("wb-updated.wb-tabs", ".wb-tabs", function (event, $newPanel) {
    if (wizardChanged) {
      updateWizard();
      wizardChanged = false;
    }
  });

  $('#wizard input').change(function () { wizardChanged = true; })

  // Focus highlighting
  // $('#wizard input').focus(function () { $(this).closest('.checkbox').addClass('focus'); });
  // $('#wizard input').blur(function () { $(this).closest('.checkbox').removeClass('focus'); });
};

var selectClauses = function (clauses, select) {
  $clauses = $('#clauses');
  for (var i = 0; i < clauses.length; i++) {
    var clauseNum = clauses[i];
    // Find the id of the clause checkbox
    $clause = $clauses.find('input[data-number="' + clauseNum + '"]');
    if (select) {
      if (!$clause.is(':checked')) {
        $clause.click();
      }
    } else {
      if ($clause.is(':checked')) {
        $clause.click();
      }
    }
  }
}

var selectNone = function () {
  $('#clauses input').prop('checked', false).prop('indeterminate', false);
  $('[role="treeitem"]').attr('aria-checked', false);
};

var updateWizard = function () {
  selectNone();

  // Select relevant Step 2 clauses based on Step 1 selections
  $('#wizard input:checked').not('.onlyIf').each(function () {
    var questionId = this.id;
    $('#question-data ul[data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode')) {
        $clause.click();
      }
    });
  });

  // Deselect irrelevant Step 2 clauses based on Step 1 "if and only if" selections
  $('#wizard input.onlyIf').not(':checked').each(function () {
    var questionId = this.id;
    $('#question-data ul[data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode')) {
        $clause.click();
      }
    });
  });

};

// Call the setup function to initialize the handler
$(document).ready(function() {
  setupQuestionHandler();
});

var setupQuestionHandler = function () {
  // Bind events for checkAll and uncheckAll buttons
  $('#checkAll').click(function (e) {
    e.preventDefault();
    const section = document.querySelector('#wizard');
    const checkboxes = section.querySelectorAll('.checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (!checkbox.checked){
          checkbox.checked = true;
        }
    });
    updateWizard();
  });

  $('#uncheckAll').click(function (e) {
    e.preventDefault();
    const section = document.querySelector('#wizard');
    const checkboxes = section.querySelectorAll('.checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked){
          checkbox.checked = false;
        }
    });
    updateWizard();
  });
};

// Triggers the modal when the restore link is activated
$(document).ready(function() {
  $( "#centred-popup-modal" ).trigger( "open.wb-overlaylbx" );
});

// Restore JSON files
$(document).ready(function() {
  setupRestoreJSONHandler();
});

var setupRestoreJSONHandler = function () {
  checkFile();
  sendFileToServer();
}

var checkFile = function () {
  const fileInput = document.getElementById('fileInput');
  if (fileInput) {
    // Check if the event listener is already attached before adding it
    if (!fileInput.hasListener) {
      fileInput.hasListener = true; // Set a flag to prevent re-attaching
      
      fileInput.addEventListener('change', async (event) => {
        const submitButton = document.getElementById("modal-submit-button");
        
        const file = event.target.files[0];
        if (!file){
          alert('No file selected.');
          return;
        }

        const parseJsonFile = (file) => {
          return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.onload = (event) => resolve(JSON.parse(event.target.result)); // triggered when the file is successfully read
            fileReader.onerror = (error) => reject(error); // triggered if an error occurs during file reading
            fileReader.readAsText(file);
          });
        };

        let type=""

        const currentURL = window.location.href;
        if (currentURL.includes("questions")) {
          type = "question"
        } else if (currentURL.includes("clauses")) {
          type = "clause"
        } else {
          type = "info"
        } 

        try {
          const object = await parseJsonFile(file);

          //Determine which type of file it has to be then perform checks on the parsed JSON object
          switch (type) {
            case "question":
              if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
                // `object[0]` exists and is not null or undefined

                if (object[0].hasOwnProperty('clauses') && object[0].hasOwnProperty('_id')  && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('description') && object[0].hasOwnProperty('frDescription')) {
                  console.log('This is indeed a question JSON list.');
                  submitButton.setAttribute("aria-disabled", "false");
                } else {
                  console.log('This is not a question JSON list.');
                  submitButton.setAttribute("aria-disabled", "true");
                  alert("This is not a question list JSON file. It seems that the file you uploaded does not have some of the attributes of a question object. Please verify that you uploaded the correct document. \nNote: Until you add the correct document the Submit button will be disabled.")
                } 
              }
              break;

            case "clause":
              if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
                // `object[0]` exists and is not null or undefined

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('number')  && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('description') && object[0].hasOwnProperty('frDescription') && object[0].hasOwnProperty('informative') && object[0].hasOwnProperty('weight')&& object[0].hasOwnProperty('compliance') && object[0].hasOwnProperty('frCompliance')) {
                  console.log('This is indeed a clause JSON list.');
                  submitButton.setAttribute("aria-disabled", "false");
                  
                } else {
                  console.log('This is not a clause JSON list.');
                  submitButton.setAttribute("aria-disabled", "true");
                  alert("This is not a clause list JSON file. It seems that the file you uploaded does not have some of the attributes of a clause object. Please verify that you uploaded the correct document. \nNote: Until you add the correct document the Submit button will be disabled.")
                }
              }
              break;

            case "info":
              if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
                // `object[0]` exists and is not null or undefined

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('name')  && object[0].hasOwnProperty('bodyHtml') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('frBodyHtml')&& object[0].hasOwnProperty('showHeading') && object[0].hasOwnProperty('order')) {
                  console.log('This is indeed an info JSON list.');
                  submitButton.setAttribute("aria-disabled", "false");
                  
                } else {
                  console.log('This is not a info JSON list.');
                  submitButton.setAttribute("aria-disabled", "true");
                  alert("This is not an info list JSON file. It seems that the file you uploaded does not have some of the attributes of an info object. Please verify that you uploaded the correct document. \nNote that until you add the correct document the Submit button will be disabled.")
                }
              }
              break;
          }
        } catch (error) {
          console.log('Error parsing JSON file:', error);
          alert('Error parsing JSON file.'); // can be removed after testing
        }
      });
    }
  }

}

var sendFileToServer = function () {

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = function(event) {
        resolve(event.target.result);
      };
      reader.onerror = function(error) {
        reject(error);
      };
      reader.readAsText(file);
    });
  }
  
  const submitButton = document.getElementById("modal-submit-button");
  if (submitButton){
    if (!submitButton.hasListener) {
      submitButton.hasListener = true; // Set a flag to prevent re-attaching
      
      submitButton.addEventListener('click', async function(event) {
        event.preventDefault();
        const ariaDisabled = submitButton.getAttribute("aria-disabled");
        let updateSuccessful = false;

        if (ariaDisabled == "true") {
          console.log("Event prevented");
          return;
        }
        const cancelButton = document.getElementById("cancel-overlay");
        const closeButton = document.getElementById("close-overlay");

        const formComponent = document.getElementById("form");
        let jsonContent;
        // const formData = new FormData();
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        // Parse the JSON content
        try {
          const fileContent = await readFileAsText(file);
          const jsonObject = JSON.parse(fileContent);
          jsonContent = JSON.stringify(jsonObject);
        } catch (e) {
          console.log("Invalid JSON file:", e);
        }

        fetch(formComponent.action,{
          method:'Post',
          headers: {'Content-Type': 'application/json'},
          body: jsonContent
        })
        .then(response => response.json())
        .then(data => {
          const dialogText = document.getElementById('dialog-text');
          dialogText.textContent = data.message;
          formComponent.remove();
          cancelButton.remove();
          updateSuccessful = data.success
        
          if (updateSuccessful){
            closeButton.classList.remove("popup-modal-dismiss")
            closeButton.addEventListener('click', function() {
              window.location.reload(); 
            });

          } else {
            console.log('Data update failed');
          }
        })
        .catch(error => {
          console.log('Error:', error);
          const dialogText = document.getElementById('dialog-text');
          dialogText.textContent = 'An error occurred while uploading the file. Try again';
          dialogText.textContent = data.message;
        });
      });
    }
  }
}


/* Generator question handling */

// var setupQuestionHandler = function () {
//   // #question is the <select> element (see /views/select_fps.pug)
//   $('#question').change(function () { updateQuestionSelections(); });
// };

// var updateQuestionSelections = function () {
//   var question = $('#question').val();
//   // Save existing selections

//   // Uncheck all checkboxes
//   $('#clauses input').prop('checked', false);
//   // Get hidden question data (see /views/select_fps.pug)
//   $('#' + question + ' li').each(function () {
//     // Check the question checkboxes
//     $('#' + this.innerHTML).prop('checked', true);
//   });
//   $('[role="treeitem"]').each(function () {
//     updateAriaChecked($(this));
//   });
// };