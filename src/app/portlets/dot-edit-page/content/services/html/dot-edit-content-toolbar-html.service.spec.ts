import { TestBed } from '@angular/core/testing';
import { DotEditContentToolbarHtmlService } from './dot-edit-content-toolbar-html.service';
import { DotMessageService } from '../../../../../api/services/dot-messages-service';
import { MockDotMessageService } from '../../../../../test/dot-message-service.mock';
import { DotDOMHtmlUtilService } from './dot-dom-html-util.service';

describe('DotEditContentToolbarHtmlService', () => {
    let dotEditContentToolbarHtmlService: DotEditContentToolbarHtmlService;
    let testDoc: Document;
    let dummyContainer: HTMLDivElement;

    const messageServiceMock = new MockDotMessageService({
        'editpage.content.contentlet.menu.drag': 'Drag',
        'editpage.content.contentlet.menu.edit': 'Edit',
        'editpage.content.contentlet.menu.remove': 'Remove',
        'editpage.content.container.action.add': 'Add',
        'editpage.content.container.menu.content': 'Content',
        'editpage.content.container.menu.widget': 'Widget',
        'editpage.content.container.menu.form': 'Form'
    });

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [
                DotEditContentToolbarHtmlService,
                DotDOMHtmlUtilService,
                { provide: DotMessageService, useValue: messageServiceMock }
            ]
        });
        dotEditContentToolbarHtmlService = TestBed.get(DotEditContentToolbarHtmlService);
    });

    describe('container toolbar', () => {
        let containerEl: Element;
        let addButtonEl: Element;
        let menuItems: NodeListOf<Element>;

        describe('default', () => {
            beforeEach(() => {
                testDoc = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
                dummyContainer = testDoc.createElement('div');
                const htmlElement: HTMLHtmlElement = testDoc.getElementsByTagName('html')[0];
                dummyContainer.innerHTML = `
                    <div data-dot-object="container">
                        <div data-dot-object="contentlet">
                            <div class="large-column"></div>
                        </div>
                    </div>
                `;
                htmlElement.appendChild(dummyContainer);
                dotEditContentToolbarHtmlService.addContainerToolbar(testDoc);

                containerEl = testDoc.querySelector('[data-dot-object="container"]');
                addButtonEl = testDoc.querySelector('.dotedit-container__add');
                menuItems = testDoc.querySelectorAll('.dotedit-container__menu-item');
            });

            it('should create container toolbar', () => {
                expect(containerEl).not.toBe(null);
                expect(containerEl.classList.contains('disabled')).toBe(false);
            });

            it('should have add button', () => {
                expect(addButtonEl).not.toBe(null);
                expect(addButtonEl.attributes.getNamedItem('disabled')).toEqual(null);
            });

            it('should have actions', () => {
                expect(menuItems.length).toEqual(3);
            });
        });

        describe('disabled', () => {
            beforeEach(() => {
                const htmlElement: HTMLHtmlElement = testDoc.getElementsByTagName('html')[0];
                dummyContainer.innerHTML = `
                    <div data-dot-object="container" data-dot-can-add="false">
                        <div data-dot-object="contentlet">
                            <div class="large-column"></div>
                        </div>
                    </div>
                `;
                htmlElement.appendChild(dummyContainer);
                dotEditContentToolbarHtmlService.addContainerToolbar(testDoc);

                containerEl = testDoc.querySelector('[data-dot-object="container"]');
                addButtonEl = testDoc.querySelector('.dotedit-container__add');
                menuItems = testDoc.querySelectorAll('.dotedit-container__menu-item');
            });

            it('should create container toolbar disabled', () => {
                expect(containerEl.classList.contains('disabled')).toBe(true);
            });

            it('should have add button disabled', () => {
                expect(addButtonEl.attributes.getNamedItem('disabled')).not.toEqual(null);
            });

            it('should not have add actions', () => {
                expect(menuItems.length).toEqual(0);
            });

            xit('should bind events');
        });
    });

    describe('contentlet toolbar', () => {
        beforeEach(() => {
            testDoc = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
            dummyContainer = testDoc.createElement('div');
            const htmlElement: HTMLHtmlElement = testDoc.getElementsByTagName('html')[0];
            dummyContainer.innerHTML = `
                <div data-dot-object="container">
                    <div data-dot-object="contentlet" data-dot-can-edit="false">
                        <div class="large-column"></div>
                    </div>
                </div>
            `;
            htmlElement.appendChild(dummyContainer);
            dotEditContentToolbarHtmlService.addContentletMarkup(testDoc);
        });

        it('should create buttons', () => {
            expect(testDoc.querySelectorAll('.dotedit-contentlet__drag').length).toEqual(1);
            expect(testDoc.querySelectorAll('.dotedit-contentlet__edit').length).toEqual(1);
            expect(testDoc.querySelectorAll('.dotedit-contentlet__remove').length).toEqual(1);
        });

        it('should have edit button disabled', () => {
            expect(testDoc.querySelector('.dotedit-contentlet__edit').classList.contains('dotedit-contentlet__disabled')).toBe(true);
        });

        xit('should bind events');
    });
});
