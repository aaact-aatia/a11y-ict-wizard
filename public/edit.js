$(document).on("wb-ready.wb", function () {
	setupRestoreJSONHandler();

	if (typeof tinymce !== 'undefined') {
		console.log('TinyMCE loaded, initializing editors...');
		$('textarea').each(function () {
			if (!$(this).hasClass('no-editor')) {
				initEditor(this, $(this).attr('lang') === 'fr' ? 'fr_FR' : 'en_US');
			}
		});
	} else {
		console.error('TinyMCE not available. Check that TinyMCE CDN loaded correctly.');
	}
});

$(document).ready(function () {
	$("#centred-popup-modal").trigger("open.wb-overlaylbx");
	setupRestoreJSONHandler();
});

var setupRestoreJSONHandler = function () {
	checkFile();
	sendFileToServer();
}

var checkFile = function () {
	const fileInput = document.getElementById('fileInput');
	if (fileInput) {
		if (!fileInput.hasListener) {
			fileInput.hasListener = true;

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
						fileReader.onload = (event) => resolve(JSON.parse(event.target.result));
						fileReader.onerror = (error) => reject(error);
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

					switch (type) {
						case "question":
							if (object.length > 0 && typeof object[0] === 'object' && object[0] !== null) {
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
					alert('Error parsing JSON file.');
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
			submitButton.hasListener = true;

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
				const fileInput = document.getElementById('fileInput');
				const file = fileInput.files[0];

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
// clause loader handler 
$(function () {
	var $form = $('form[action="clause_loader"][enctype="multipart/form-data"]');
	if ($form.length) {
		$form.on('submit', function (e) {
			e.preventDefault();
			var formData = new FormData(this);
			var $submitBtn = $(this).find('button[type="submit"]');
			$submitBtn.prop('disabled', true);

			fetch($form.attr('action'), {
				method: 'POST',
				body: formData
			})
				.then(async response => {
					let msg;
					if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
						const data = await response.json();
						msg = data.message || JSON.stringify(data);
					} else {
						msg = await response.text();
					}
					$('#dialog').text(msg);
					$('#modal-clauseLoader').trigger('open.wb-overlay');
				})
				.catch(() => {
					$('#dialog').text('An error occurred while uploading the files.');
					$('#modal-clauseLoader').trigger('open.wb-overlay');
				})
				.finally(() => {
					$submitBtn.prop('disabled', false);
				});
		});
	}
});
// question loader handler
$(function () {
	var $form = $('form[action="question_loader"][enctype="multipart/form-data"]');
	if ($form.length) {
		$form.on('submit', function (e) {
			e.preventDefault();
			var formData = new FormData(this);
			var $submitBtn = $(this).find('button[type="submit"]');
			$submitBtn.prop('disabled', true);

			fetch($form.attr('action'), {
				method: 'POST',
				body: formData
			})
				.then(async response => {
					let msg;
					if (response.headers.get('content-type') && response.headers.get('content-type').includes('application/json')) {
						const data = await response.json();
						msg = data.message || JSON.stringify(data);
					} else {
						msg = await response.text();
					}
					$('#dialog').text(msg);
					$('#modal-questionLoader').trigger('open.wb-overlay');
				})
				.catch(() => {
					$('#dialog').text('An error occurred while uploading the file.');
					$('#modal-questionLoader').trigger('open.wb-overlay');
				})
				.finally(() => {
					$submitBtn.prop('disabled', false);
				});
		});
	}
});
