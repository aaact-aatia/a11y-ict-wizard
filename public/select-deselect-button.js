function selectAll() {
    const section = document.querySelector('#wizard'); // Select the section with id "wizard"
    const checkboxes = section.querySelectorAll('.checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked == false){
            checkbox.checked = true;
        }
    });
    console.log("in function")
}

function deselectAll() {
    const container = document.querySelector('#wizard'); // Select the section with id "wizard"
    const checkboxes = container.querySelectorAll('.checkbox input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        if (checkbox.checked == true){
            checkbox.checked = false;
        }
    });
}