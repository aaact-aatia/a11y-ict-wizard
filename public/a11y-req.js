// Client side scripts for a11y-req
// NOT FOR WET OVERRIDES

var questionMap = {};
// { clauseId: { input, li, informative, ancestors } } for every end node in #clauses
var endNodeClauses = {};
var clauseTreeInputs = [];
var clauseTreeItems = [];
$(document).on("wb-ready.wb", function (event) {

  var questionMapElement = document.getElementById('question-map');
  if (questionMapElement) {
    questionMap = JSON.parse(questionMapElement.textContent);
  }

  setupEndNodeClauses();

  setupTreeHandler();

  setupWizardHandler();

  setupQuestionListHandler();

  updateWizard();

  setupQuestionHandler();

  showRemoved();
  hideRemoved();
  //used for steps 1 to 3
  setupShowHideHandler();

  undoHandler();

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

/* TinyMCE - configuration in tinymce-init.js */

/* Wizard questions */

var setupWizardHandler = function () {

  $('.wizard input').on('change', function () {
    updateWizard();
    step1SubsetsQuestionHandler();
    step2QuestionHandler();
    step3QuestionHandler();
    updateWizard();

  });
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
  $('#showAllRemovedClauses').click(function (e) {
    e.preventDefault();
    $('#clauses input:not(:checked)').each(function () {
      var $element = $(this).closest('[role="treeitem"]');
      $element.removeClass('hidden');
    });
    $('.disabledClauses').removeClass('hidden');
    $('.disabledClauses').text("Disable clauses are now shown.")
    setTimeout(function () { $('.disabledClauses').addClass('hidden'); }, 250);

    // Update the ARIA tree visibility after showing items
    if (window.trees && window.trees.length > 0) {
      for (var i = 0; i < window.trees.length; i++) {
        window.trees[i].updateVisibvarreeitems();
      }
    }
  });
}

var hideRemoved = function () {
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
    setTimeout(function () { $('.disabledClauses').addClass('hidden'); }, 250);

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
  clauseTreeInputs.forEach(function (input) {
    input.checked = true;
    input.indeterminate = false;
  });
  clauseTreeItems.forEach(function (item) {
    item.setAttribute('aria-checked', 'true');
  });
};

var clauseCounter = function () {
  var totalClauses = 0;
  for (var clauseId in endNodeClauses) {
    var clause = endNodeClauses[clauseId];
    if (clause.input.checked && !clause.informative) {
      totalClauses++;
    }
  }
  $('.clauseCount').text(totalClauses);
}

var setupEndNodeClauses = function () {
  var clausesRoot = document.getElementById('clauses');
  endNodeClauses = {};
  clauseTreeInputs = $('#clauses input').toArray();
  clauseTreeItems = $('[role="treeitem"]').toArray();
  if (!clausesRoot) {
    return;
  }
  $(clausesRoot).find('li.endNode').each(function () {
    var input = this.querySelector('input[type="checkbox"]');
    if (!input) {
      return;
    }
    // Nearest ancestor first
    var ancestors = [];
    var node = this.parentElement.closest('li[role="treeitem"]');
    while (node && clausesRoot.contains(node)) {
      ancestors.push(node);
      node = node.parentElement.closest('li[role="treeitem"]');
    }
    endNodeClauses[input.id] = {
      input: input,
      li: this,
      informative: this.classList.contains('informative'),
      ancestors: ancestors
    };
  });
};

// Returns the cached end node for a clause id if it is normative, otherwise undefined
var getNormativeEndNode = function (clauseId) {
  var clause = endNodeClauses[clauseId];
  return clause && !clause.informative ? clause : undefined;
};

var updateWizard = function () {
  var $wizard = $('.wizard');
  if ($wizard.length > 0) {
    // Everything has to be selected by default for negative selection
    selectAll();

    var mergedQuestionMap = Object.assign({}, questionMap.step1, questionMap.step2, questionMap.step3);
    // Ancestor treeitem -> depth, so parents can be refreshed once each, deepest first
    var ancestorDepths = new Map();

    $wizard.find('input:checked').each(function () {
      mergedQuestionMap[this.id].forEach(function (clauseId) {
        var clause = endNodeClauses[clauseId];
        // aria-disabled checkboxes ignore clicks in aria-tree.js, so leave them untouched
        if (!clause || !clause.input.checked || clause.input.getAttribute('aria-disabled') === 'true') {
          return;
        }
        clause.input.checked = false;
        clause.li.setAttribute('aria-checked', 'false');
        var depth = clause.ancestors.length;
        clause.ancestors.forEach(function (ancestor, i) {
          ancestorDepths.set(ancestor, depth - i);
        });
      });
    });

    Array.from(ancestorDepths.keys())
      .sort(function (a, b) { return ancestorDepths.get(b) - ancestorDepths.get(a); })
      .forEach(function (ancestor) { updateAriaChecked($(ancestor)); });

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
  step4Handler();
  if ($newPanel.attr('id') === 'details-step4') {
    $('#clauses input').each(function () {
      $(this).attr('aria-disabled', true);
    })
  }
  //update selectedQuestions field and summary in step 4
  var selectionsIds = [];
  var selectionsNames = [];
  $('.wizard input:checked').each(function () {
    // Use jQuery wrapper to read attributes safely
    var $input = $(this);
    if ($input.attr('aria-disabled') === 'true') {
      return; // skip this one
    }

    var cloneLabel = document.querySelector("label[for='" + this.id + "']").cloneNode(true);
    cloneLabel.querySelector("span").remove();
    selectionsNames.push(cloneLabel.textContent);
    selectionsIds.push(this.id);
  });
  $('#selectedQuestions').val(selectionsIds.join());
  populateSelectionSummary(selectionsNames);
});

var uncheckedStep1ClauseIds = [];
var checkedStep1QuestionsIds = [];
var previouscheckedStep1QuestionsIds = [];
var uncheckedStep2ClauseIds = [];
var checkedStep2QuestionsIds = [];
var previouscheckedStep2QuestionsIds = [];
var uncheckedStep3ClauseIds = [];
var checkedStep3QuestionsIds = [];
var previouscheckedStep3QuestionsIds = [];
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

function disableQuestion($checkbox, $element, $dialogLink, toggleBtnSelector) {
  $checkbox.siblings('span.remove-disabled-text').removeClass('hidden');
  $element.css('color', '#AD0000');
  $element.attr('tabindex', 0);
  $dialogLink.attr('tabindex', -1);
  $dialogLink.addClass('no-pointer-events');
  $checkbox.prop('checked', true);
  $checkbox.attr('aria-disabled', true);
  if ($(toggleBtnSelector).attr('aria-checked') === 'false') {
    $element.addClass('hidden');
  }
  $('.autoCheckedAnnounce').removeClass('hidden');
  $('.autoUncheckedAnnounce').addClass('hidden');
  setTimeout(function () { $('.autoCheckedAnnounce').addClass('hidden'); }, 250);
}

function enableQuestion($checkbox, $element, $dialogLink) {
  $checkbox.siblings('span.remove-disabled-text').addClass('hidden');
  $element.css('color', '#333333');
  $element.removeAttr('tabindex');
  $element.removeClass('hidden');
  $dialogLink.attr('tabindex', 0);
  $dialogLink.removeClass('no-pointer-events');
  $checkbox.prop('checked', false);
  $checkbox.removeAttr('aria-disabled');
  $('.autoUncheckedAnnounce').removeClass('hidden');
  $('.autoCheckedAnnounce').addClass('hidden');
  setTimeout(function () { $('.autoUncheckedAnnounce').addClass('hidden'); }, 250);
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
        enableQuestion($questionStep1Checkbox, $element, $dialogLink);
      }
    }
  });

  previouscheckedStep1QuestionsIds = checkedStep1QuestionsIds.slice();
  uncheckedStep1ClauseIds.length = 0;
  checkedStep1QuestionsIds.length = 0;

  // reload checkboxes as they might have been changed by the undo action or by the reactivation of hidden elements and we want to make sure to get the right list of checked checkboxes
  $checkboxes = $('.wizard input.isUber:checked');
  $checkboxes.each(function () {
    var questionId = this.id;
    checkedStep1QuestionsIds.push(questionId);
    questionMap.step1[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
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

    questionMap.step1[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
        if (!(uncheckedStep1ClauseIds.includes(clauseId))) {
          checkedParentinStep1 = false;
        }
      }
    });

    questionMap.step1[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (covered) {
        if (clause && clause.input.checked && checkedParentinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep1Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedParentinStep1) {
      disableQuestion($questionStep1Checkbox, $element, $dialogLink, '#toggleAutoHiddenOptionsStep1');
      wasRemoved = true;
    } else if ($questionStep1Checkbox.attr('aria-disabled') === 'true') {
      enableQuestion($questionStep1Checkbox, $element, $dialogLink);
    }
  });

  updateWizard();
  setTimeout(function () {
    if (wasRemoved) {
      $('.disabledQuestions').removeClass('hidden');
      $('.disabledQuestions').text("Questions whose clauses are covered by checked question are now hidden.");
      setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 250);
    }
  }, 500);
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
        enableQuestion($questionStep2Checkbox, $element, $dialogLink);
      }
    }
  });

  previouscheckedStep2QuestionsIds = checkedStep2QuestionsIds.slice();
  checkedStep2QuestionsIds.length = 0;
  uncheckedStep2ClauseIds.length = 0;

  $('.wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    questionMap.step1[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
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

    questionMap.step2[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
        if (!(uncheckedStep2ClauseIds.includes(clauseId))) {
          checkedinStep1 = false;
        }
      }
    });

    questionMap.step2[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (covered) {
        if (clause && clause.input.checked && checkedinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep2Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedinStep1) {
      disableQuestion($questionStep2Checkbox, $element, $dialogLink, '#toggleAutoHiddenOptionsStep2');
    } else if ($questionStep2Checkbox.attr('aria-disabled') === 'true') {
      enableQuestion($questionStep2Checkbox, $element, $dialogLink);
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
        enableQuestion($questionStep3Checkbox, $element, $dialogLink);
      }
    }
  });

  previouscheckedStep3QuestionsIds = checkedStep3QuestionsIds.slice();
  checkedStep3QuestionsIds.length = 0;
  uncheckedStep3ClauseIds.length = 0;

  $('.wizard input.isUber:checked').each(function () {
    var questionId = this.id;
    questionMap.step1[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
        if (!uncheckedStep3ClauseIds.includes(clauseId)) {
          uncheckedStep3ClauseIds.push(clauseId);
        }
      }
    });
  });

  $('.wizard input:checked').not('.isUber').not('.isUnique').each(function () {
    var questionId = this.id;
    questionMap.step2[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
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

    questionMap.step3[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (clause && !clause.input.checked) {
        if (!(uncheckedStep3ClauseIds.includes(clauseId))) {
          checkedinStep1 = false;
        }
      }
    });

    questionMap.step3[questionId].forEach(function (clauseId) {
      var clause = getNormativeEndNode(clauseId);
      if (covered) {
        if (clause && clause.input.checked && checkedinStep1) {
          covered = false;
        }
      }
    });

    var $element = $allCheckboxElements.filter('.checkbox-' + questionId);
    var $questionStep3Checkbox = $(this);
    var $dialogLink = $allDialogLinks.filter('[href="#moreInfo' + questionId + '"]');

    if (covered && checkedinStep1) {
      disableQuestion($questionStep3Checkbox, $element, $dialogLink, '#toggleAutoHiddenOptionsStep3');
    } else if ($questionStep3Checkbox.attr('aria-disabled') === 'true') {
      enableQuestion($questionStep3Checkbox, $element, $dialogLink);
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
function setupShowHideHandler() {
  $(function () {
    $('#toggleAutoHiddenOptionsStep1').on('click', function (e) {
      e.preventDefault();
      var $btn = $(this);
      var pressed = $btn.attr('aria-checked') === 'true';
      var $checkboxes = $('.wizard input.isUber:checked');
      if (!pressed) {
        showCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'true').addClass('active');
      } else {
        hideCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'false').removeClass('active');
      }
    });
  });
  $(function () {
    $('#toggleAutoHiddenOptionsStep2').on('click', function (e) {
      e.preventDefault();
      var $btn = $(this);
      var pressed = $btn.attr('aria-checked') === 'true';
      var $checkboxes = $('.wizard input:checked').not('.isUber').not('.isUnique');
      if (!pressed) {
        showCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'true').addClass('active');
      } else {
        hideCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'false').removeClass('active');
      }
    });
  });
  $(function () {
    $('#toggleAutoHiddenOptionsStep3').on('click', function (e) {
      e.preventDefault();
      var $btn = $(this);
      var pressed = $btn.attr('aria-checked') === 'true';
      var $checkboxes = $('.wizard input:checked').filter('.isUnique');
      if (!pressed) {
        showCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'true').addClass('active');
      } else {
        hideCheckboxes($checkboxes);
        $btn.attr('aria-checked', 'false').removeClass('active');
      }
    });
  });
}
function showCheckboxes(checkboxes) {
  checkboxes.filter(function () {
    return $(this).attr('aria-disabled') === 'true';
  }).each(function () {
    var questionId = this.id;
    var $element = $('.checkbox-' + questionId);
    $element.removeClass('hidden');
  });
  $('.disabledQuestionsShown').removeClass('hidden');
  $('.disabledQuestionsHidden').addClass('hidden');

  setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 250);

}
function hideCheckboxes(checkboxes) {
  checkboxes.filter(function () {
    return $(this).attr('aria-disabled') === 'true';
  }).each(function () {
    var questionId = this.id;
    var $element = $('.checkbox-' + questionId);
    $element.addClass('hidden');
  });
  $('.disabledQuestionsHidden').removeClass('hidden');
  $('.disabledQuestionsShown').addClass('hidden');

  setTimeout(function () { $('.disabledQuestions').addClass('hidden'); }, 250);
}
function populateSelectionSummary(selectionsNames) {
  const summaryList = document.getElementById("selectionSummary");

  // Clear existing list items
  summaryList.innerHTML = "";

  // Add new list items from selectionsNames array
  selectionsNames.forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    summaryList.appendChild(li);
  });
  var $default = $('#defaultSelectionSummary');
  if (selectionsNames.length === 0) {
    $default.removeClass('hidden');
  } else {
    $default.addClass('hidden');

  }
}
