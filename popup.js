let foundFields = []; // Store found input fields globally
document.addEventListener('DOMContentLoaded', function() {
  const askButton = document.getElementById('askButton');
  const questionInput = document.getElementById('questionInput');
  const chatContainer = document.getElementById('chat-container');
  const resumeLink = document.getElementById('resumeLink');
  const getQuestionsButton = document.getElementById('getQuestionsButton');
  const fillButton = document.getElementById('fillButton');
  const questionsContainer = document.getElementById('questionsContainer');

  askButton.addEventListener('click', function() {
    const question = questionInput.value;
    if (question) {
      appendMessage(question, 'user');
      questionInput.value = '';
      
      // Replace with your actual AI API call
      setTimeout(() => {
        const answer = `This is a placeholder answer to: \"${question}\"`;
        appendMessage(answer, 'bot');
      }, 1000);
    }
  });

  // content.js
if (resumeLink) {
    resumeLink.addEventListener('dragstart', (event) => {
      console.log('Drag started!');
      event.dataTransfer.setData('text/uri-list', resumeLink.href);
      event.dataTransfer.setData('text/plain', resumeLink.href);
      event.dataTransfer.effectAllowed = 'copy';
    });
  }

  getQuestionsButton.addEventListener('click', function() {
    if (getQuestionsButton.textContent === 'Finding...') {
      return; 
    }
    else {
    getQuestionsButton.textContent = 'Finding...';
    getQuestionsButton.disabled = true;
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: findInputFields,
        },
        (injectionResults) => {
          questionsContainer.innerHTML = '';
          foundFields = []; // Reset stored fields
          let allFieldsMap = new Map(); // Use Map to avoid duplicates by selector
          
          if (injectionResults) {
            for (const frameResult of injectionResults) {
              if (frameResult.result && Array.isArray(frameResult.result)) {
                frameResult.result.forEach(field => {
                  // Use selector as unique key
                  allFieldsMap.set(field.selector, field);
                });
              }
            }
          }

          foundFields = Array.from(allFieldsMap.values());

          if (foundFields.length > 0) {
            foundFields.forEach((field, index) => {
              createFormField(field, index);
            });
          } else {
            const noFieldsDiv = document.createElement('div');
            noFieldsDiv.textContent = 'No input fields found on this page.';
            questionsContainer.appendChild(noFieldsDiv);
          }
          
          getQuestionsButton.textContent = 'Find Input Fields';
          getQuestionsButton.disabled = false;
        }
      );
    });
  }
});

  fillButton.addEventListener('click', function() {
    if (foundFields.length === 0) {
      alert('Please find input fields first!');
      return;
    }

    fillButton.textContent = 'Filling...';
    fillButton.disabled = true;

    // Collect answers from the form
    const answersToFill = foundFields.map((field, index) => {
      const answerInput = document.getElementById(`answer-${index}`);
      return {
        selector: field.selector,
        value: answerInput ? answerInput.value : ''
      };
    }).filter(item => item.value.trim() !== ''); // Only send non-empty answers

    // Send answers to content script to fill the form
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.scripting.executeScript(
        {
          target: { tabId: tabs[0].id, allFrames: true },
          function: fillInputFields,
          args: [answersToFill]
        },
        () => {
          fillButton.textContent = 'Fill';
          fillButton.disabled = false;
          alert('Form filled successfully!');
        }
      );
    });
  });

  function createFormField(field, index) {
    const fieldDiv = document.createElement('div');
    fieldDiv.classList.add('form-field');
    fieldDiv.style.marginBottom = '15px';
    fieldDiv.style.padding = '10px';
    fieldDiv.style.border = '1px solid #ddd';
    fieldDiv.style.borderRadius = '4px';

    // Question label
    const questionLabel = document.createElement('div');
    questionLabel.style.fontWeight = 'bold';
    questionLabel.style.marginBottom = '5px';
    questionLabel.textContent = field.question || 'Unnamed Field';
    fieldDiv.appendChild(questionLabel);

    // Field info (type and selector)
    const fieldInfo = document.createElement('div');
    fieldInfo.style.fontSize = '12px';
    fieldInfo.style.color = '#666';
    fieldInfo.style.marginBottom = '8px';
    fieldInfo.textContent = `Type: ${field.type} | Selector: ${field.selector}`;
    fieldDiv.appendChild(fieldInfo);

    // Answer input
    const answerInput = document.createElement('input');
    answerInput.type = 'text';
    answerInput.id = `answer-${index}`;
    answerInput.placeholder = 'Enter answer here...';
    answerInput.style.width = '100%';
    answerInput.style.padding = '5px';
    answerInput.style.boxSizing = 'border-box';
    fieldDiv.appendChild(answerInput);

    questionsContainer.appendChild(fieldDiv);
  }

  function appendMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('chat-message', sender + '-message');
    messageDiv.textContent = text;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
});

function findInputFields() {
  const fields = [];
  const processedSelectors = new Set();
  const processedRadioNames = new Set();
  const processedCheckboxNames = new Set();

  const inputs = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select'
  );

  inputs.forEach((input, idx) => {
    // Skip invisible elements
    if (!input.offsetParent && input.type !== 'hidden') return;

    // --------- RADIO GROUP HANDLING ----------
    if (input.type === 'radio') {
      if (processedRadioNames.has(input.name)) return;
      processedRadioNames.add(input.name);

      const group = document.querySelectorAll(`input[type="radio"][name="${input.name}"]`);
      const firstRadio = group[0];
      let question = '';

      // Find label text or nearby question
      const parentLabel = firstRadio.closest('label');
      if (parentLabel && parentLabel.previousElementSibling) {
        const prev = parentLabel.previousElementSibling;
        if (['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
          question = prev.textContent.trim();
      }

      if (!question) {
        const container = firstRadio.closest('div, fieldset, section, form') || firstRadio.parentElement;
        if (container && container.previousElementSibling) {
          const prev = container.previousElementSibling;
          if (['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
            question = prev.textContent.trim();
        }
      }

      if (!question && input.name) question = input.name.replace(/[-_]/g, ' ');
      if (!question) question = 'radio group';

      fields.push({
        question,
        selector: `input[type="radio"][name="${input.name}"]`,
        type: 'radio',
        name: input.name,
        options: Array.from(group).map(r => ({
          label: r.closest('label')?.textContent.trim() || r.value,
          value: r.value
        }))
      });

      return;
    }

    // --------- CHECKBOX GROUP HANDLING ----------
    if (input.type === 'checkbox') {
      if (processedCheckboxNames.has(input.name)) return;
      processedCheckboxNames.add(input.name);

      const group = document.querySelectorAll(`input[type="checkbox"][name="${input.name}"]`);
      const firstCheckbox = group[0];
      let question = '';

      // Try to find nearby question text
      const parentLabel = firstCheckbox.closest('label');
      if (parentLabel && parentLabel.previousElementSibling) {
        const prev = parentLabel.previousElementSibling;
        if (['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
          question = prev.textContent.trim();
      }

      if (!question) {
        const container = firstCheckbox.closest('div, fieldset, section, form') || firstCheckbox.parentElement;
        if (container && container.previousElementSibling) {
          const prev = container.previousElementSibling;
          if (['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
            question = prev.textContent.trim();
        }
      }

      if (!question && input.name) question = input.name.replace(/[-_]/g, ' ');
      if (!question) question = 'checkbox group';

      fields.push({
        question,
        selector: `input[type="checkbox"][name="${input.name}"]`,
        type: 'checkbox',
        name: input.name,
        options: Array.from(group).map(c => ({
          label: c.closest('label')?.textContent.trim() || c.value,
          value: c.value
        }))
      });

      return;
    }

    // --------- DROPDOWN HANDLING ----------
    if (input.tagName.toLowerCase() === 'select') {
      let question = '';

      // Label for select
      if (input.id) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        if (label) question = label.textContent.trim();
      }

      // Parent label
      if (!question) {
        const parentLabel = input.closest('label');
        if (parentLabel) question = parentLabel.textContent.trim();
      }

      // Previous sibling (e.g. text above dropdown)
      if (!question) {
        const prev = input.previousElementSibling;
        if (prev && ['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
          question = prev.textContent.trim();
      }

      if (!question && input.name) question = input.name.replace(/[-_]/g, ' ');
      if (!question) question = 'dropdown field';

      const options = Array.from(input.options).map(o => ({
        label: o.textContent.trim(),
        value: o.value
      }));

      fields.push({
        question,
        selector: input.id ? `#${input.id}` : `[name="${input.name}"]`,
        type: 'select',
        name: input.name || '',
        id: input.id || '',
        options
      });

      return;
    }

    // --------- NORMAL INPUT / TEXTAREA HANDLING ----------
    let selector = '';
    if (input.id) {
      selector = `#${input.id}`;
    } else if (input.name) {
      selector = `[name="${input.name}"]`;
    } else {
      const uniqueId = `auto-field-${idx}-${Date.now()}`;
      input.setAttribute('data-auto-fill-id', uniqueId);
      selector = `[data-auto-fill-id="${uniqueId}"]`;
    }

    if (processedSelectors.has(selector)) return;
    processedSelectors.add(selector);

    // Find question for standard fields
    let question = '';

    // Associated label
    if (input.id) {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (label) question = label.textContent.trim();
    }

    // Parent label
    if (!question) {
      const parentLabel = input.closest('label');
      if (parentLabel) question = parentLabel.textContent.replace(input.value || '', '').trim();
    }

    // Previous sibling
    if (!question) {
      const prev = input.previousElementSibling;
      if (prev && ['LABEL', 'SPAN', 'DIV', 'P', 'B', 'STRONG'].includes(prev.tagName))
        question = prev.textContent.trim();
    }

    // Placeholder, aria-label, or fallback
    if (!question && input.placeholder) question = input.placeholder;
    if (!question && input.getAttribute('aria-label')) question = input.getAttribute('aria-label');
    if (!question && input.name) question = input.name.replace(/[-_]/g, ' ');
    if (!question) question = `${input.tagName.toLowerCase()} field`;

    fields.push({
      question,
      selector,
      type: input.type || input.tagName.toLowerCase(),
      name: input.name || '',
      id: input.id || '',
      placeholder: input.placeholder || ''
    });
  });

  return fields;
}




// This function runs in the context of the webpage to fill fields
function fillInputFields(answersArray) {
  answersArray.forEach(answer => {
    try {
      const element = document.querySelector(answer.selector);
      if (element) {
        // Set the value
        element.value = answer.value;
        
        // Trigger events to ensure the webpage detects the change
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        element.dispatchEvent(new Event('blur', { bubbles: true }));
      }
    } catch (error) {
      console.error('Error filling field:', answer.selector, error);
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  const logoutButton = document.getElementById("logoutButton");

  logoutButton.addEventListener("click", function () {
    // Clear the loggedIn flag from storage
    chrome.storage.sync.set({ loggedIn: false }, function () {
      // Redirect to the login page
      window.location.href = "login.html";
    });
  });

  // TODO: Add any other popup functionality here.
});
