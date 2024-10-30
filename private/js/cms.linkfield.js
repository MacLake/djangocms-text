/* eslint-env es11 */
/* jshint esversion: 11 */
/* global document, window, console */

import "../css/cms.linkfield.css";

class LinkField {
    constructor(element, options) {
        this.options = options;
        this.urlElement = element;
        this.form = element.closest("form");
        this.selectElement = this.form.querySelector(`input[name="${this.urlElement.id + '_select'}"]`);
        if (this.selectElement) {
            this.prepareField();
            this.registerEvents();
        }
    }

    prepareField() {
        this.inputElement = document.createElement('input');
        this.inputElement.setAttribute('type', 'text');
        this.inputElement.setAttribute('autocomplete', 'off');
        this.inputElement.setAttribute('spellcheck', 'false');
        this.inputElement.setAttribute('autocorrect', 'off');
        this.inputElement.setAttribute('autocapitalize', 'off');
        this.inputElement.setAttribute('placeholder', this.urlElement.getAttribute('placeholder'));
        this.inputElement.classList.add('cms-linkfield-input');
        if (this.selectElement.value) {
            this.handleChange({target: this.selectElement});
            this.inputElement.classList.add('cms-linkfield-selected');
        } else if (this.urlElement.value) {
            this.inputElement.value = this.urlElement.value;
            this.inputElement.classList.remove('cms-linkfield-selected');
        }
        if (this.selectElement.getAttribute('data-value')) {
            this.inputElement.value = this.selectElement.getAttribute('data-value');
            this.inputElement.classList.add('cms-linkfield-selected');
        }
        if (this.selectElement.getAttribute('data-href')) {
            this.urlElement.value = this.selectElement.getAttribute('data-href');
            this.inputElement.classList.add('cms-linkfield-selected');
        }
        this.wrapper = document.createElement('div');
        this.wrapper.classList.add('cms-linkfield-wrapper');
        this.urlElement.insertAdjacentElement('afterend', this.wrapper);
        this.urlElement.setAttribute('type', 'hidden');
        this.dropdown = document.createElement('div');
        this.dropdown.classList.add('cms-linkfield-dropdown');
        if (this.form.style.zIndex) {
            this.dropdown.style.zIndex = this.form.style.zIndex + 1;
        }
        this.wrapper.appendChild(this.inputElement);
        this.wrapper.appendChild(this.dropdown);
    }

    registerEvents() {
        this.inputElement.addEventListener('input', this.handleInput.bind(this));
        this.inputElement.addEventListener('focus', event => this.search());
        // this.inputElement.addEventListener('blur', event => {
        //     setTimeout(() => { this.dropdown.style.visibility = 'hidden'; }, 200);
        // });
        this.urlElement.addEventListener('input', event => {
            this.inputElement.value = event.target.value || '';
            this.inputElement.classList.remove('cms-linkfield-selected');
            // this.selectElement.value = '';
        });
        this.selectElement.addEventListener('input', event => this.handleChange(event));
        this.intersection = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.updateSearch();
                    observer.disconnect();
                }
            });
        });
    }

    handleInput(event) {
        // User typed something into the field -> no predefined value selected
        this.selectElement.value = '';
        this.urlElement.value = this.inputElement.value;
        this.inputElement.classList.remove('cms-linkfield-selected');
        this.search();
       }

    showResults(response, page = 1) {
        var currentSection;  // Keep track of the current section so that paginated data can be added
        if (page === 1) {
            // First page clears the dropdown
            this.dropdown.innerHTML = '';
            currentSection = '';
        } else {
            // Remove the more link
            const more = this.dropdown.querySelector('.cms-linkfield-more');
            currentSection = more?.dataset.group;
            more?.remove();
        }
        response.results.forEach(result => currentSection = this._addResult(result, currentSection));
        if (response?.pagination?.more) {
            const more = document.createElement('div');
            more.classList.add('cms-linkfield-more');
            more.setAttribute('data-page', page + 1);
            more.setAttribute('data-group', currentSection);
            more.textContent = '...';
            this.dropdown.appendChild(more);
            this.intersection.observe(more);
        }
    }

    _addResult(result, currentSection = '') {
        const item = document.createElement('div');
        item.textContent = result.text;
        if (result.id) {
            item.classList.add('cms-linkfield-option');
            item.setAttribute('data-value', result.id);
            item.setAttribute('data-href', result.url);
            item.setAttribute('data-text', result.verbose || result.text);
            item.addEventListener('click', this.handleSelection.bind(this));
        }
        if (result.children && result.children.length > 0) {
            item.classList.add('cms-linkfield-parent');
            if (result.text !== currentSection) {
                this.dropdown.appendChild(item);
                currentSection = result.text;
            }
            result.children.forEach(child => {
                this._addResult(child);
            });
        } else {
            this.dropdown.appendChild(item);
        }
        return currentSection;
    }

    handleSelection(event) {
        event.stopPropagation();
        event.preventDefault();
        this.inputElement.value = event.target.getAttribute('data-text') || event.target.textContent;
        this.inputElement.classList.add('cms-linkfield-selected');
        this.urlElement.value = event.target.getAttribute('data-href');
        this.selectElement.value = event.target.getAttribute('data-value');
        this.inputElement.blur();
        // this.dropdown.innerHTML = '';  // CSS hides dropdown when empty
    }

    handleChange(event) {
        if (this.selectElement.value) {
            fetch(this.options.url + '?g=' + encodeURIComponent(this.selectElement.value))
                .then(response => response.json())
                .then(data => {
                    this.inputElement.value = data.text;
                    this.inputElement.classList.add('cms-linkfield-selected');
                    this.urlElement.value = data.url;
                });
        }
    }

    search(page = 1) {
        const searchText = this.inputElement.value.toLowerCase();
        this.fetchData(searchText, page).then(response => {
            this.showResults(response, page);
        }).catch (error => {
           this.dropdown.innerHTML = `<div class="cms-linkfield-error">${error.message}</div>`;
        });
    }

    updateSearch() {
        const more = this.dropdown.querySelector('.cms-linkfield-more');
        if (more) {
            this.search(parseInt(more.getAttribute('data-page')));
        }
    }

    fetchData(searchText, page ) {
        if (this.options.url) {
            return fetch(this.options.url + `?q=${encodeURIComponent(searchText)}${page > 1 ? '&page=' + page : ''}`)
                .then(response => response.json());
        }
        return new Promise(resolve => {
            resolve({results: []});
        });
    }
}

export default LinkField;
