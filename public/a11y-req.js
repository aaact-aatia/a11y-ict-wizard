// Client side scripts for a11y-req
// NOT FOR WET OVERRIDES

$(document).on("wb-ready.wb", function (event) {

  setupTreeHandler();

  setupWizardHandler();

  setupQuestionListHandler();

  updateWizard();

  setupQuestionHandler();

  setupRestoreJSONHandler();

  showRemoved();

  hideRemoved();

  undoHandler();

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

var setupQuestionListHandler = function () {
  // #questionList is the <textarea> element (see /views/wizard.pug)
  $('#questionList').change(function () { updateQuestionSelections(); });
};

var updateQuestionSelections = function () {
  var questionList = $('#questionList').val();
  if (questionList.trim().length === 0) {
    //if the user left the edit field empty we do nothing.
    return;
  }
  // Uncheck all checkboxes
  const sections = document.querySelectorAll('.wizard');
  sections.forEach((section) => {
    section.querySelectorAll('.checkbox input[type="checkbox"]:checked').forEach((checkbox) => {
      checkbox.checked = false;
    });
  });
  // clean up the question text provided before attempting to find an select the checkboxes
  questionList.split('\n').forEach((line) => {
    var questionText = line.trim();
    if (questionText.length == 0) {
      return;
    }
    // strip out any leading or trailing characters from each line
    if (questionText.substring(0, 2) == '•	') {
      questionText = questionText.substring(2, questionText.length);
    }
    if (questionText.slice(-1) == ';') {
      questionText = questionText.substring(0, questionText.length - 1);
    }
    if (questionText.slice(-4) == ' and' || questionText.slice(-3) == ' et') {
      questionText = questionText.substring(0, questionText.length - 3).trim();
    }
    // search if the label exists, if it does check the checkbox related to it
    var label = $("label:contains(" + questionText + ")");
    if (label.length === 0) {
      console.log(questionText + " was not found to match any checkboxes");
    } else {
      var checkbox = document.querySelector('.checkbox input[id="' + label.attr('for') + '"]');
      checkbox.checked = true;
    }
  });
  updateWizard();
  step1SubsetsQuestionHandler();
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

  $('.wizard input').on('change', function () {
    updateWizard();

    var $activeTabLink = $('.wb-tabs .active a');
    var activeTabHref = $activeTabLink.attr('href').replace('#', '');

    /*if (activeTabHref === 'details-step1'){
      step1SubsetsQuestionHandler();
    }
    if (activeTabHref === 'details-step2') {
      step2QuestionHandler();
    }
    if (activeTabHref === 'details-step3'){
      step3QuestionHandler();
    }*/
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();

  });

  // Focus highlighting
  // $('.wizard input').focus(function () { $(this).closest('.checkbox').addClass('focus'); });
  // $('.wizard input').blur(function () { $(this).closest('.checkbox').removeClass('focus'); });
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

var showRemoved = function () {
  $('#showAllRemovedStep1').click(function (e) {
    e.preventDefault();
    $('.wizard input.isUber:checked').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.removeClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now shown.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#showAllRemovedStep2').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked').not('.isUber').not('.isUnique').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.removeClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now shown.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#showAllRemovedStep3').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked').filter('.isUnique').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.removeClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now shown.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#showAllRemovedClauses').click(function (e) {
    e.preventDefault();
    $('#clauses input:not(:checked)').each(function () {
      var $element = $(this).closest('[role="treeitem"]');
      $element.removeClass('hidden');
    });
    $('.disabledClauses').removeClass('hidden');
    $('.disabledClauses').text("Disable clauses are now shown.")
    setTimeout(function () { $('.disabledClauses').addClass('hidden'); }, 500);

    // Update the ARIA tree visibility after showing items
    if (window.trees && window.trees.length > 0) {
      for (var i = 0; i < window.trees.length; i++) {
        window.trees[i].updateVisibvarreeitems();
      }
    }
  });
}

var hideRemoved = function () {
  $('#hideAllRemovedStep1').click(function (e) {
    e.preventDefault();
    $('.wizard input.isUber:checked').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.addClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now hidden.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#hideAllRemovedStep2').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked').not('.isUber').not('.isUnique').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.addClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now hidden.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#hideAllRemovedStep3').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked').filter('.isUnique').filter(function () {
      return $(this).attr('aria-disabled') === 'true';
    }).each(function () {
      var questionId = this.id;
      var $element = $('.checkbox-' + questionId);
      $element.addClass('hidden');
    });
    $('.disabledQuestions').removeClass('hidden');
    $('.disabledQuestions').text("Disable questions are now hidden.");
    setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
  });

  $('#hideAllRemovedClauses').click(function (e) {
    e.preventDefault();
    $('#clauses input:not(:checked)').each(function () {
      if (!$(this).prop('indeterminate')) {
        var $element = $(this).closest('[role="treeitem"]');
        $element.addClass('hidden');
      }
    });
    $('.disabledClauses').removeClass('hidden');
    $('.disabledClauses').text("Disable clauses are now hidden.");
    setTimeout(function () { $('.disabledClauses').addClass('hidden'); }, 500);

    // Update the ARIA tree visibility after hiding items
    if (window.trees && window.trees.length > 0) {
      for (var i = 0; i < window.trees.length; i++) {
        window.trees[i].updateVisibvarreeitems();
      }
    }
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

var clauseCounter = function () {
  var totalClauses = 0
  $('#clauses input:checked').each(function () {
    if (($(this).closest('li').hasClass('endNode')) && !($(this).closest('li').hasClass('informative'))) {
      totalClauses++;
    }
  });
  $('.clauseCount').text(totalClauses);
}

var updateWizard = function () {
  var $wizard = $('.wizard');
  if ($wizard.length > 0) {
    // Everything has to be selected by default for negative selection
    selectAll();

    // Cache selectors for performance
    var $wizardInputsChecked = $wizard.find('input:checked');
    var $clauses = $('#clauses');
    var $clauseInputs = $clauses.find('input');
    var $clauseInputsChecked = $clauseInputs.filter(':checked');
    var $clauseLis = $clauses.find('li.endNode');

    // Select relevant Step 2 and 3 clauses based on Step 1 selections
    $wizardInputsChecked.each(function () {
      var questionId = this.id;
      $('[id^="question-data-step"] ul[data-question-id=' + questionId + '] li').each(function () {
        var clauseId = this.innerHTML;
        var $clause = $('#' + clauseId);
        // Only click if checked and is endNode
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

  if (!($newPanel.attr('id') === 'details-step4')) {

    $('#clauses input').each(function () {
      $(this).removeAttr('aria-disabled');
    })
  }
  step2QuestionHandler();
  step3QuestionHandler();
  //updateWizard();
  step4Handler();
  if ($newPanel.attr('id') === 'details-step4') {
    $('#clauses input').each(function () {
      $(this).attr('aria-disabled', true);
    })
  }
  //update selectedQuestions field
  var selections = [];
  $('.wizard input:checked').each(function () {
    selections.push(this.id);
  });
  $('#selectedQuestions').val(selections.join());
});

var uncheckedStep1ClauseIds = [];
var checkedStep1QuestionsIds = [];
var previouscheckedStep1QuestionsIds = [];
var undo = false;

var undoHandler = function () {
  $('#undoLastStep1').click(function (e) {
    e.preventDefault();
    undo = true;
    // console.log('Undo Previous checked');
    // console.log(previouscheckedStep1QuestionsIds);
    // console.log('Undo checked');
    // console.log(checkedStep1QuestionsIds);
    // if checked is less than previous check it means that last action was an uncheck or a deselect all
    if (checkedStep1QuestionsIds.length < previouscheckedStep1QuestionsIds.length) {
      undo = false;
      var count = 0;
      var lastInteractedQuestion;

      while ((count < previouscheckedStep1QuestionsIds.length)) {
        if (!checkedStep1QuestionsIds.includes(previouscheckedStep1QuestionsIds[count])) {
          lastInteractedQuestion = previouscheckedStep1QuestionsIds[count];
          var $lastCheckbox = $('.wizard input.isUber#' + lastInteractedQuestion);
          $lastCheckbox.prop('checked', true);
        }
        count++
      }
    }
    checkedStep1QuestionsIds = previouscheckedStep1QuestionsIds.slice();
    updateWizard();
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();
    undo = false;
  });

  $('#undoLastStep2').click(function (e) {
    e.preventDefault();
    undo = true;

    // if checked is less than previous check it means that last action was an uncheck or a deselect all
    if (checkedStep2QuestionsIds.length < previouscheckedStep2QuestionsIds.length) {
      undo = false;
      var count = 0;
      var lastInteractedQuestion;

      while ((count < previouscheckedStep2QuestionsIds.length)) {
        if (!checkedStep2QuestionsIds.includes(previouscheckedStep2QuestionsIds[count])) {
          lastInteractedQuestion = previouscheckedStep2QuestionsIds[count];
          var $lastCheckbox = $('.wizard input#' + lastInteractedQuestion);
          var $checkboxes = $('.wizard input[type="checkbox"]').not('.isUber').not('.isUnique');
          var $lastCheckbox = $checkboxes.filter('#' + lastInteractedQuestion);
          $lastCheckbox.prop('checked', true);
        }
        count++
      }
    }
    checkedStep2QuestionsIds = previouscheckedStep2QuestionsIds.slice();
    updateWizard();
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();

    undo = false;
  });
  $('#undoLastStep3').click(function (e) {
    e.preventDefault();
    undo = true;

    // if checked is less than previous check it means that last action was an uncheck or a deselect all
    if (checkedStep3QuestionsIds.length < previouscheckedStep3QuestionsIds.length) {
      undo = false;
      var count = 0;
      var lastInteractedQuestion;

      while ((count < previouscheckedStep3QuestionsIds.length)) {
        if (!checkedStep3QuestionsIds.includes(previouscheckedStep3QuestionsIds[count])) {
          lastInteractedQuestion = previouscheckedStep3QuestionsIds[count];
          var $lastCheckbox = $('.wizard input#' + lastInteractedQuestion);
          var $checkboxes = $('.wizard input[type="checkbox"]').filter('.isUnique');
          var $lastCheckbox = $checkboxes.filter('#' + lastInteractedQuestion);
          $lastCheckbox.prop('checked', true);
        }
        count++
      }
    }
    checkedStep3QuestionsIds = previouscheckedStep3QuestionsIds.slice();
    updateWizard();
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();

    undo = false;
  });



}

var step1SubsetsQuestionHandler = function () {
  var wasRemoved = false;
  var $wizardInputs = $('.wizard input.isUber');
  var $checkboxes = $('.wizard input.isUber:checked');
  var $allCheckboxElements = $('.checkbox');
  var $allDialogLinks = $('a[href^="#moreInfo"]');

  $checkboxes.each(function () {
    var questionId = this.id;
    if (!checkedStep1QuestionsIds.includes(questionId)) {
      var $questionStep1Checkbox = $(this);
      if ($questionStep1Checkbox.attr('aria-disabled') === 'true' || undo) {
        var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
        var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');
        $questionStep1Checkbox.siblings('span.remove-disabled-text').text('');
        $element.css('color', '#333333');
        $element.removeAttr('tabindex');
        $element.removeClass('hidden');
        $dialogLink.attr('tabindex', 0);
        $dialogLink.removeClass('no-pointer-events');
        $questionStep1Checkbox.removeAttr('aria-disabled');
        $questionStep1Checkbox.prop('checked', false);
      }
    }
  });

  previouscheckedStep1QuestionsIds = checkedStep1QuestionsIds.slice();
  uncheckedStep1ClauseIds.length = 0;
  checkedStep1QuestionsIds.length = 0;

  $checkboxes.each(function () {
    var questionId = this.id;
    checkedStep1QuestionsIds.push(questionId);
    $('[id^="uber-question-data-step"] ul[data-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep1ClauseIds.includes(clauseId)) {
          uncheckedStep1ClauseIds.push(clauseId);
        }
      }
    });
  });

  $wizardInputs.each(function () {
    var questionId = this.id;
    if (checkedStep1QuestionsIds.includes(questionId)) {
      return true;
    }
    var covered = true;
    var checkedParentinStep1 = true;

    $('[id^="uber-question-data-step"] ul[data-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!(uncheckedStep1ClauseIds.includes(clauseId))) {
          checkedParentinStep1 = false;
        }
      }
    });

    $('[id^="uber-question-data-step"] ul[data-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (covered) {
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative') && checkedParentinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep1Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedParentinStep1) {
      $questionStep1Checkbox.siblings('span.remove-disabled-text').text('[removed] ');
      $element.css('color', '#AD0000');
      $element.attr('tabindex', 0);
      $dialogLink.attr('tabindex', -1);
      $dialogLink.addClass('no-pointer-events');
      $questionStep1Checkbox.prop('checked', true);
      $questionStep1Checkbox.attr('aria-disabled', true);
      wasRemoved = true;
      $element.addClass('hidden');
    } else if ($questionStep1Checkbox.attr('aria-disabled') === 'true') {
      $questionStep1Checkbox.siblings('span.remove-disabled-text').text('');
      $element.css('color', '#333333');
      $element.removeAttr('tabindex');
      $element.removeClass('hidden');
      $dialogLink.attr('tabindex', 0);
      $dialogLink.removeClass('no-pointer-events');
      $questionStep1Checkbox.prop('checked', false);
      $questionStep1Checkbox.removeAttr('aria-disabled');
    }
  });

  updateWizard();
  setTimeout(function () {
    if (wasRemoved) {
      $('.disabledQuestions').removeClass('hidden');
      $('.disabledQuestions').text("Questions whose clauses are covered by checked question are now hidden.");
      setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 500);
    }
  }, 3000);
}

var step2QuestionHandler = function () {
  var $step2Inputs = $('.wizard input').not('.isUber').not('.isUnique');
  var $step2CheckedInputs = $step2Inputs.filter(':checked');
  var $allCheckboxElements = $('.checkbox');
  var $allDialogLinks = $('a[href^="#moreInfo"]');

  $step2CheckedInputs.each(function () {
    var questionId = this.id;
    var $questionStep2Checkbox = $(this);
    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');
    if (!checkedStep2QuestionsIds.includes(questionId)) {
      if (undo) {
        $questionStep2Checkbox.siblings('span.remove-disabled-text').text('');
        $element.css('color', '#333333');
        $element.removeAttr('tabindex');
        $element.removeClass('hidden');
        $dialogLink.attr('tabindex', 0);
        $dialogLink.removeClass('no-pointer-events');
        $questionStep2Checkbox.removeAttr('aria-disabled');
        $questionStep2Checkbox.prop('checked', false);
      }
    }
  });

  previouscheckedStep2QuestionsIds = checkedStep2QuestionsIds.slice();
  checkedStep2QuestionsIds.length = 0;
  uncheckedStep2ClauseIds.length = 0;

  $('.wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    $('[id^="uber-question-data-step"] ul[data-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep2ClauseIds.includes(clauseId)) {
          uncheckedStep2ClauseIds.push(clauseId);
        }
      }
    });
  });

  $step2Inputs.each(function () {
    var questionId = this.id;
    if (checkedStep2QuestionsIds.includes(questionId)) {
      return true;
    }
    var covered = true;
    var checkedinStep1 = true;

    if ($(this).is(':checked')) {
      checkedStep2QuestionsIds.push(questionId);
    }

    $('[id^="non-uber-question-data-step"] ul[data-non-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!(uncheckedStep2ClauseIds.includes(clauseId))) {
          checkedinStep1 = false;
        }
      }
    });

    $('[id^="non-uber-question-data-step"] ul[data-non-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (covered) {
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative') && checkedinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep2Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedinStep1) {
      $questionStep2Checkbox.siblings('span.remove-disabled-text').text('[removed] ');
      $element.css('color', '#AD0000');
      $element.attr('tabindex', 0);
      $dialogLink.attr('tabindex', -1);
      $dialogLink.addClass('no-pointer-events');
      $questionStep2Checkbox.attr('aria-disabled', true);
      $questionStep2Checkbox.prop('checked', true);
      $element.addClass('hidden');
    } else if ($questionStep2Checkbox.attr('aria-disabled') === 'true') {
      $questionStep2Checkbox.siblings('span.remove-disabled-text').text('');
      $element.css('color', '#333333');
      $element.removeAttr('tabindex');
      $element.removeClass('hidden');
      $dialogLink.attr('tabindex', 0);
      $dialogLink.removeClass('no-pointer-events');
      $questionStep2Checkbox.prop('checked', false);
      $questionStep2Checkbox.removeAttr('aria-disabled');
    }
  });
}

var step3QuestionHandler = function () {
  var $step3Inputs = $('.wizard input').filter('.isUnique');
  var $step3CheckedInputs = $step3Inputs.filter(':checked');
  var $allCheckboxElements = $('.checkbox');
  var $allDialogLinks = $('a[href^="#moreInfo"]');

  $step3CheckedInputs.each(function () {
    var questionId = this.id;
    var $questionStep3Checkbox = $(this);
    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');
    if (!checkedStep3QuestionsIds.includes(questionId)) {
      if (undo) {
        $questionStep3Checkbox.siblings('span.remove-disabled-text').text('');
        $element.css('color', '#333333');
        $element.removeAttr('tabindex');
        $element.removeClass('hidden');
        $dialogLink.attr('tabindex', 0);
        $dialogLink.removeClass('no-pointer-events');
        $questionStep3Checkbox.removeAttr('aria-disabled');
        $questionStep3Checkbox.prop('checked', false);
      }
    }
  });

  previouscheckedStep3QuestionsIds = checkedStep3QuestionsIds.slice();
  checkedStep3QuestionsIds.length = 0;
  uncheckedStep3ClauseIds.length = 0;

  $('.wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    $('[id^="uber-question-data-step"] ul[data-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep3ClauseIds.includes(clauseId)) {
          uncheckedStep3ClauseIds.push(clauseId);
        }
      }
    });
  });

  $('.wizard input:checked').not('.isUber').not('.isUnique').each(function () {
    var questionId = this.id;
    $('[id^="non-uber-question-data-step"] ul[data-non-uber-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!uncheckedStep3ClauseIds.includes(clauseId)) {
          uncheckedStep3ClauseIds.push(clauseId);
        }
      }
    });
  });

  $step3Inputs.each(function () {
    var questionId = this.id;
    if (checkedStep3QuestionsIds.includes(questionId)) {
      return true;
    }
    var covered = true;
    var checkedinStep1 = true;

    if ($(this).is(':checked')) {
      checkedStep3QuestionsIds.push(questionId);
    }

    $('[id^="unique-question-data-step"] ul[data-unique-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (!$clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative')) {
        if (!(uncheckedStep3ClauseIds.includes(clauseId))) {
          checkedinStep1 = false;
        }
      }
    });

    $('[id^="unique-question-data-step"] ul[data-unique-question-id=' + questionId + '] li').each(function () {
      var clauseId = this.innerHTML.trim();
      var $clause = $('#' + clauseId);
      if (covered) {
        if ($clause.is(':checked') && $clause.closest('li').hasClass('endNode') && !$clause.closest('li').hasClass('informative') && checkedinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep3Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedinStep1) {
      $questionStep3Checkbox.siblings('span.remove-disabled-text').text('[removed] ');
      $element.css('color', '#AD0000');
      $element.attr('tabindex', 0);
      $dialogLink.attr('tabindex', -1);
      $dialogLink.addClass('no-pointer-events');
      $questionStep3Checkbox.attr('aria-disabled', true);
      $questionStep3Checkbox.prop('checked', true);
      $element.addClass('hidden');
    } else if ($questionStep3Checkbox.attr('aria-disabled') === 'true') {
      $questionStep3Checkbox.siblings('span.remove-disabled-text').text('');
      $element.css('color', '#333333');
      $element.removeAttr('tabindex');
      $element.removeClass('hidden');
      $dialogLink.attr('tabindex', 0);
      $dialogLink.removeClass('no-pointer-events');
      $questionStep3Checkbox.prop('checked', false);
      $questionStep3Checkbox.removeAttr('aria-disabled');
    }
  });
}

// Color the clauses depending on whether they are unchecked, mixed or checked 
var step4Handler = function () {
  $('#clauses input').each(function () {
    var $this = $(this);
    var $checkboxContainer = $this.closest('[role="treeitem"]');
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

  // Update the ARIA tree visibility after hiding/showing items
  if (window.trees && window.trees.length > 0) {
    for (var i = 0; i < window.trees.length; i++) {
      window.trees[i].updateVisibvarreeitems();
    }
  }
}

// Call the setup function to initialize the handler
$(document).ready(function () {
  setupQuestionHandler();
});

var setupQuestionHandler = function () {
  // Bind events for checkAll and uncheckAll buttons
  // check all for step 1
  $('#checkAll1').click(function (e) {
    e.preventDefault();
    $('.wizard input.isUber').not(':checked').prop('checked', true);
    updateWizard();
    step1SubsetsQuestionHandler();
  });
  // step 2 check all
  $('#checkAll2').click(function (e) {
    e.preventDefault();
    $('.wizard input').not(':checked').not('.isUber').not('.isUnique').prop('checked', true);
    updateWizard();
    step2QuestionHandler();
  });
  // step 3 checkAll
  $('#checkAll3').click(function (e) {
    e.preventDefault();
    $('.wizard input.isUnique').not(':checked').prop('checked', true);
    updateWizard();
    step3QuestionHandler();
  });

  $('#uncheckAll1').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked.isUber').prop('checked', false);
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();
  });
  $('#uncheckAll2').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked').not('.isUber').not('.isUnique').prop('checked', false);
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();
  });
  $('#uncheckAll3').click(function (e) {
    e.preventDefault();
    $('.wizard input:checked.isUnique').prop('checked', false);
    step3QuestionHandler();
    updateWizard();
  });
};

// Triggers the modal when the restore link is activated
$(document).ready(function () {
  $("#centred-popup-modal").trigger("open.wb-overlaylbx");
});

// Restore JSON files
$(document).ready(function () {
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
        if (!file) {
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

        let type = ""

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

                if (object[0].hasOwnProperty('clauses') && object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('description') && object[0].hasOwnProperty('frDescription')) {
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

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('number') && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('description') && object[0].hasOwnProperty('frDescription') && object[0].hasOwnProperty('informative') && object[0].hasOwnProperty('weight') && object[0].hasOwnProperty('compliance') && object[0].hasOwnProperty('frCompliance')) {
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

                if (object[0].hasOwnProperty('_id') && object[0].hasOwnProperty('name') && object[0].hasOwnProperty('bodyHtml') && object[0].hasOwnProperty('frName') && object[0].hasOwnProperty('frBodyHtml') && object[0].hasOwnProperty('showHeading') && object[0].hasOwnProperty('order')) {
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
      reader.onload = function (event) {
        resolve(event.target.result);
      };
      reader.onerror = function (error) {
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  const submitButton = document.getElementById("modal-submit-button");
  if (submitButton) {
    if (!submitButton.hasListener) {
      submitButton.hasListener = true; // Set a flag to prevent re-attaching

      submitButton.addEventListener('click', async function (event) {
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

        fetch(formComponent.action, {
          method: 'Post',
          headers: { 'Content-Type': 'application/json' },
          body: jsonContent
        })
          .then(response => response.json())
          .then(data => {
            const dialogText = document.getElementById('dialog-text');
            dialogText.textContent = data.message;
            closeButton.textContent = "Close"
            formComponent.remove();
            updateSuccessful = data.success

            if (updateSuccessful) {
              closeButton.classList.remove("popup-modal-dismiss")
              closeButton.addEventListener('click', function () {
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