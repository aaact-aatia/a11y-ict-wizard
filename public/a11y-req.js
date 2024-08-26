// Client side scripts for a11y-req
// NOT FOR WET OVERRIDES

$(document).on("wb-ready.wb", function (event) {

  setupTreeHandler();

  setupWizardHandler();

  setupClauseListHandler();

  updateWizard();

  setupQuestionHandler();

  setupRestoreJSONHandler();

  showRemoved();

  hideRemoved();

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

  $('#wizard input').on('change', function () {
    updateWizard();
    step1SubsetsQuestionHandler();
  });

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

var showRemoved = function(){
  $('#showAllRemovedStep1').click(function (e) {
    e.preventDefault();
    $('#wizard input.isUber:checked').filter(function() {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function() {
      var questionId = this.id;
      var $element = $('.checkbox#'+questionId);
      $element.removeClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now shown.");
    setTimeout(function() {$('.disabledQuestions').addClass('hidden');}, 500);
  });

  $('#showAllRemovedStep2').click(function (e) {
    e.preventDefault();
    $('#wizard input:checked').not('.isUber').filter(function() {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function() {
      var questionId = this.id;
      var $element = $('.checkbox#'+questionId);
      $element.removeClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now shown.");
    setTimeout(function() {$('.disabledQuestions').addClass('hidden');}, 500);
  });

  $('#showAllRemovedClauses').click(function (e) {
    e.preventDefault();
    $('#clauses input:not(:checked)').each(function () {
      var $element = $(this).closest('.checkbox');
      $element.removeClass('hidden');
    });
    $('.disabledClauses').removeClass('hidden');
    $('.disabledClauses').text("Disable clauses are now shown.")
    setTimeout(function() {$('.disabledClauses').addClass('hidden');}, 500);
  });
}

var hideRemoved = function(){
  $('#hideAllRemovedStep1').click(function (e) {
    e.preventDefault();
    $('#wizard input.isUber:checked').filter(function() {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function() {
      var questionId = this.id;
      var $element = $('.checkbox#'+questionId);
      $element.addClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now hidden.");
    setTimeout(function() {$('.disabledQuestions').addClass('hidden');}, 500);
  });

  $('#hideAllRemovedStep2').click(function (e) {
    e.preventDefault();
    $('#wizard input:checked').not('.isUber').filter(function() {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function() {
      var questionId = this.id;
      var $element = $('.checkbox#'+questionId);
      $element.addClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now hidden.");
    setTimeout(function() {$('.disabledQuestions').addClass('hidden');}, 500);
  });

  $('#hideAllRemovedClauses').click(function (e) {
    e.preventDefault();
    $('#clauses input:not(:checked)').each(function () {
      if (!$(this).prop('indeterminate')){
        var $element = $(this).closest('.checkbox');
        $element.addClass('hidden');
      }
    });
    $('.disabledClauses').removeClass('hidden');
    $('.disabledClauses').text("Disable clauses are now hidden.");
    setTimeout(function() {$('.disabledClauses').addClass('hidden');}, 500);
  });
}

var selectNone = function () {
  $('#clauses input').prop('checked', false).prop('indeterminate', false);
  $('[role="treeitem"]').attr('aria-checked', false);
};

var selectAll = function () {
  $('#clauses input').prop('checked', true).prop('indeterminate', false);
  $('[role="treeitem"]').attr('aria-checked', true);
};

var clauseCounter = function() {
  // Just to count total number of clauses can be removed afterwards
  var totalClauses = 0
  $('#clauses input:checked').each(function () {
    if ( ($(this).closest('li').hasClass('endNode')) && !($(this).closest('li').hasClass('informative')) ) {
      totalClauses++;
    }
  });
  
  $('.clause-count').html("<strong>Total number of clause applicable: " + totalClauses + "</strong>");
}

var updateWizard = function () {
  if ($('#wizard').length > 0) {
    // Everything has to be selected by default for negative selection
    selectAll();    

    // Select relevant Step 2 clauses based on Step 1 selections
    $('#wizard input:checked').each(function () {
      var questionId = this.id;
      $('#question-data ul[data-question-id='+questionId+'] li').each(function () {
        $clause = $('#'+this.innerHTML);
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode')) {
          $clause.click();
        }
      });
    });
    clauseCounter();  
  }
};

$(document).on("wb-updated.wb-tabs", ".wb-tabs", function (event, $newPanel) {
  // if attribute is not removed while in other tabs, clauses number does not update
  if (!($newPanel.attr('id') === 'details-step3')){
    $('#clauses input').each(function () {
      $(this).removeAttr('aria-disabled');
    })
  }
  step1QuestionHandler();
  step2QuestionHandler();
  step3Handler();
  if ($newPanel.attr('id') === 'details-step3'){
    $('#clauses input').each(function () {
      $(this).attr('aria-disabled', true);
    })
  }
});

var uncheckedStep1ClauseIds = [];
var checkedStep1QuestionsIds = [];

var step1SubsetsQuestionHandler = function () {
  var wasRemoved = false;
  $('#wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    var $questionStep1Checkbox = $(this);
    var $element = $('.checkbox#'+questionId);
    var $dialogLink = $('a[href="#moreInfo'+questionId+'"]');

    if (!checkedStep1QuestionsIds.includes(questionId)){
      if ($questionStep1Checkbox.attr('aria-disabled') === 'true')  {
        $questionStep1Checkbox.siblings('span.remove-disabled-text').text('');
        $element.css('color', '#333333');
        $element.removeAttr('tabindex');
        $element.removeClass('hidden');
        $dialogLink.attr('tabindex',0);
        $dialogLink.removeClass('no-pointer-events');
        $questionStep1Checkbox.removeAttr('aria-disabled');
        $questionStep1Checkbox.prop('checked',false).prop('indeterminate', false);
      }
    }
  });

  while (uncheckedStep1ClauseIds.length > 0) {
    uncheckedStep1ClauseIds.pop(); 
  }
  while (checkedStep1QuestionsIds.length > 0) {
    checkedStep1QuestionsIds.pop();
  }
  $('#wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    checkedStep1QuestionsIds.push(questionId);
    $('#uber-question-data ul[uber-data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep1ClauseIds.includes(this.innerHTML.trim())){
          uncheckedStep1ClauseIds.push(this.innerHTML.trim());
        }
      }
    });
  });

  $('#wizard input.isUber').each(function () {
    var questionId = this.id;
    if (checkedStep1QuestionsIds.includes(questionId)){
      return true;
    }
    var covered = true;
    var checkedParentinStep1 = true;
    
    $('#uber-question-data ul[uber-data-question-id='+questionId+'] li').each(function () {
      var clauseId = this.innerHTML.trim();
      $clause = $('#'+this.innerHTML);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!(uncheckedStep1ClauseIds.includes(clauseId))){
          checkedParentinStep1 = false
        }
      }
    });

    $('#uber-question-data ul[uber-data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if (covered) {
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative') && checkedParentinStep1) {
          covered = false;
        }
      }
    });

    var $element = $('.checkbox#'+questionId);
    var $questionStep1Checkbox = $(this);
    var $dialogLink = $('a[href="#moreInfo'+questionId+'"]');

    if (covered && checkedParentinStep1) {
      $questionStep1Checkbox.siblings('span.remove-disabled-text').text('[removed] ');
      $element.css('color', '#AD0000');
      $element.attr('tabindex', 0);
      $dialogLink.attr('tabindex', -1);
      $dialogLink.addClass('no-pointer-events');
      $questionStep1Checkbox.attr('aria-disabled', true);
      $questionStep1Checkbox.prop('checked', true).prop('indeterminate', false);
      wasRemoved = true;
      $element.addClass('hidden');
      // Using delays would make the disabled classes appear for 1 second when other checkboxes are being checked
      // setTimeout(function() {
      //   // Delay 1 second
      //   $element.addClass('hidden');
      // }, 1000);
    }  else if ($questionStep1Checkbox.attr('aria-disabled') === 'true')  {
      $questionStep1Checkbox.siblings('span.remove-disabled-text').text('');
      $element.css('color', '#333333');
      $element.removeAttr('tabindex');
      $element.removeClass('hidden');
      $dialogLink.attr('tabindex',0);
      $dialogLink.removeClass('no-pointer-events');
      $questionStep1Checkbox.removeAttr('aria-disabled');
      $questionStep1Checkbox.prop('checked',false).prop('indeterminate', false);
    }
  });
  updateWizard();
  setTimeout(function() {
    if (wasRemoved){
      $('.disabledQuestions').removeClass('hidden');
      $('.disabledQuestions').text("Questions whose clauses are covered by checked question are now hidden.");
      setTimeout(function() {$('.disabledQuestions').addClass('hidden');}, 500);
    }
  }, 3000);
}

var uncheckedStep2ClauseIds = [];

// Adds all the clauses associated to the checked questions to the array uncheckedStep2ClauseIds
var step1QuestionHandler = function () {
  while (uncheckedStep2ClauseIds.length > 0) {
    uncheckedStep2ClauseIds.pop(); // Remove the all element in array
  }
  $('#wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    $('#uber-question-data ul[uber-data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep2ClauseIds.includes(this.innerHTML.trim())){
          uncheckedStep2ClauseIds.push(this.innerHTML.trim());
        }
      }
    });
  });
}

var step2QuestionHandler = function () {
  $('#wizard input').not('.isUber').each(function () {
    var questionId = this.id;
    var covered = true;
    var checkedinStep1 = true;
    
    // Used to link the Step 1 question and the Step 2 question
    // Verifies if all the clauses unchecked from the non-uber question are found in the array 
    $('#non-uber-question-data ul[non-uber-data-question-id='+questionId+'] li').each(function () {
      var clauseId = this.innerHTML.trim();
      $clause = $('#'+this.innerHTML);
      // only check unchecked non-informative endnode clauses
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        // if checkedinStep1 = false, it means the the subset uber questions was unchecked or that the question istself is not an uber
        if (!(uncheckedStep2ClauseIds.includes(clauseId))){
          checkedinStep1 = false
        }
      }
    });

    // Verifies if all the clauses of the non-uber question are all unchecked, if they are covered = true
    $('#non-uber-question-data ul[non-uber-data-question-id='+questionId+'] li').each(function () {
      $clause = $('#'+this.innerHTML);
      if (covered) {
        // If clause is checked that means that uber question was not selected and question is not covered.
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative') && checkedinStep1) {
          covered = false;
        }
      }
    });

    var $element = $('.checkbox#'+questionId);
    var $questionStep2Checkbox = $(this);
    var $dialogLink = $('a[href="#moreInfo'+questionId+'"]');

    if (covered && checkedinStep1) {
      $questionStep2Checkbox.siblings('span.remove-disabled-text').text('[removed] ');
      $element.css('color', '#AD0000');
      $element.attr('tabindex', 0);
      $dialogLink.attr('tabindex', -1);
      $dialogLink.addClass('no-pointer-events');
      $questionStep2Checkbox.attr('aria-disabled', true);
      $questionStep2Checkbox.prop('checked', true).prop('indeterminate', false);
      $element.addClass('hidden');
      // Using delays would make the disabled classes appear for 1 second when other checkboxes are being checked
      // setTimeout(function() {
      //   // Delay 1 second
      //   $element.addClass('hidden');
      // }, 1000);
    }  else if ($questionStep2Checkbox.attr('aria-disabled') === 'true')  {
      $questionStep2Checkbox.siblings('span.remove-disabled-text').text('');
      $element.css('color', '#333333');
      $element.removeAttr('tabindex');
      $element.removeClass('hidden');
      $dialogLink.attr('tabindex',0);
      $dialogLink.removeClass('no-pointer-events');
      $questionStep2Checkbox.removeAttr('aria-disabled');
      $questionStep2Checkbox.prop('checked',false).prop('indeterminate', false);
    }
  });
}

// Color the clauses depending on whether they are unchecked, mixed or checked 
var step3Handler = function () {
  $('#clauses input').each(function () {
    var $this = $(this);
    var $checkboxContainer = $this.closest('.checkbox');
    if ($this.prop('indeterminate')) {
      // Checkbox is in indeterminate state
      $this.siblings('span.remove-text').text('');
      $this.siblings('span').css('color', '#333333');
      $checkboxContainer.removeClass('hidden');
    } else if ($this.is(':checked')) {
      // Checkbox is checked
      $this.siblings('span.remove-text').text('');
      $this.siblings('span').css('color', '#333333');
      $checkboxContainer.removeClass('hidden');
    } else {
      // Checkbox is not checked
      $this.siblings('span.remove-text').text('[removed]  ');
      $this.siblings('span').css('color', '#AD0000');
      $checkboxContainer.addClass('hidden');
    }
  });
}

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
    step1SubsetsQuestionHandler();
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
    step1SubsetsQuestionHandler();
    step1QuestionHandler();
    step2QuestionHandler();
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
                  submitButton.setAttribute("aria-disabled", "false");
                } else {
                  submitButton.setAttribute("aria-disabled", "true");
                  alert("This is not a question list JSON file. It seems that the file you uploaded does not have some of the attributes of a question object. Please verify that you uploaded the correct document. \nNote: Until you add the correct document the Submit button will be disabled.")
                } 
              }
              break;

            case "clause":
              if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
                // `object[0]` exists and is not null or undefined

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('number')  && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('description') && object[0].hasOwnProperty('frDescription') && object[0].hasOwnProperty('informative') && object[0].hasOwnProperty('weight')&& object[0].hasOwnProperty('compliance') && object[0].hasOwnProperty('frCompliance')) {
                  submitButton.setAttribute("aria-disabled", "false");                 
                } else {
                  submitButton.setAttribute("aria-disabled", "true");
                  alert("This is not a clause list JSON file. It seems that the file you uploaded does not have some of the attributes of a clause object. Please verify that you uploaded the correct document. \nNote: Until you add the correct document the Submit button will be disabled.")
                }
              }
              break;

            case "info":
              if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
                // `object[0]` exists and is not null or undefined

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('name')  && object[0].hasOwnProperty('bodyHtml') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('frBodyHtml')&& object[0].hasOwnProperty('showHeading') && object[0].hasOwnProperty('order')) {
                  submitButton.setAttribute("aria-disabled", "false");                  
                } else {
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
        const closeButton = document.getElementById("cancel-overlay");

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
          closeButton.textContent = "Close"
          formComponent.remove();
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