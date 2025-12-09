// TinyMCE Editor Initialization
// Accessible rich text editor with advanced list formatting and source code view

var initEditor = function (element, lang) {
  var $element = $(element);
  var elementId = $element.attr('id') || 'editor-' + Math.random().toString(36).substr(2, 9);
  $element.attr('id', elementId);

  tinymce.init({
    selector: '#' + elementId,
    height: 400,
    menubar: false,
    branding: false,
    promotion: false,
    
    // Plugins for formatting, lists, code view, and accessibility
    plugins: [
      'advlist', 'lists', 'image', 'charmap',
      'searchreplace', 'visualblocks', 'visualchars', 'code', 'fullscreen',
      'table', 'help'
    ],
    
    // Toolbar with essential formatting options
    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image table | code | removeformat | help',
    
    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
    
    // Advanced list configuration - supports alpha, roman numerals, etc.
    advlist_bullet_styles: 'default,circle,square',
    advlist_number_styles: 'default,lower-alpha,lower-roman,upper-alpha,upper-roman',
    
    // Enhanced accessibility features
    a11y_advanced_options: true,
    
    // Image accessibility - require alt text
    image_description: true,
    image_title: true,
    
    setup: function(editor) {
      editor.on('init', function() {
        console.log('TinyMCE initialized successfully for:', elementId);
      });
    }
  });
};
