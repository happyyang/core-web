import { Injectable } from '@angular/core';
import { DotMessageService } from '../../../../../api/services/dot-messages-service';
import { DotDOMHtmlUtilService } from './dot-dom-html-util.service';

/**
 * Service to generate the markup related with the Toolbars and sub-menu for containers.
 */
@Injectable()
export class DotEditContentToolbarHtmlService {
    private dragLabel: string;
    private removeLabel: string;
    private editLabel: string;

    constructor(private dotMessageService: DotMessageService, private dotDOMHtmlUtilService: DotDOMHtmlUtilService) {}

    addContainerToolbar(doc: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.dotMessageService
                .getMessages([
                    'editpage.content.container.action.add',
                    'editpage.content.container.menu.content',
                    'editpage.content.container.menu.widget',
                    'editpage.content.container.menu.form'
                ])
                .subscribe(
                    (res) => {
                        if (res.length === 0) {
                            reject();
                        }

                        try {
                            const containers = Array.from(doc.querySelectorAll('div[data-dot-object="container"]'));
                            containers.forEach((container: HTMLElement) => {
                                const isContainerDisabled = container.dataset.dotCanAdd === 'false';

                                if (isContainerDisabled) {
                                    container.classList.add('disabled');
                                }

                                const containerToolbar = document.createElement('div');
                                containerToolbar.classList.add('dotedit-container__toolbar');

                                containerToolbar.innerHTML = this.getContainerToolbarHtml(res, container, isContainerDisabled);

                                container.parentNode.insertBefore(containerToolbar, container);
                            });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    },
                    (error) => {
                        reject(error);
                    }
                );
        });
    }

    addContentletMarkup(doc: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.dotMessageService
                .getMessages([
                    'editpage.content.contentlet.menu.drag',
                    'editpage.content.contentlet.menu.edit',
                    'editpage.content.contentlet.menu.remove'
                ])
                .subscribe(
                    (res) => {
                        if (res.length === 0) {
                            reject();
                        }

                        try {
                            const contentlets = Array.from(doc.querySelectorAll('div[data-dot-object="contentlet"]'));
                            contentlets.forEach((contentlet: HTMLElement) => {
                                const contentletToolbar = document.createElement('div');
                                contentletToolbar.classList.add('dotedit-contentlet__toolbar');

                                (this.dragLabel = res['editpage.content.contentlet.menu.drag']),
                                    (this.editLabel = res['editpage.content.contentlet.menu.edit']),
                                    (this.removeLabel = res['editpage.content.contentlet.menu.remove']);

                                contentletToolbar.innerHTML = this.getContentButton(
                                    contentlet.dataset.dotIdentifier,
                                    contentlet.dataset.dotInode,
                                    contentlet.dataset.dotCanEdit === 'true'
                                );

                                const contentletContent = document.createElement('div');
                                contentletContent.classList.add('dotedit-contentlet__content');
                                contentletContent.innerHTML = contentlet.innerHTML;
                                contentlet.innerHTML = '';

                                contentlet.insertAdjacentElement('afterbegin', contentletContent);
                                contentlet.insertAdjacentElement('afterbegin', contentletToolbar);
                            });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    },
                    (error) => {
                        reject(error);
                    }
                );
        });
    }

    getContentButton(identifier: string, inode: string, canEdit?: boolean): string {
        const dataset = {
            'dot-identifier': identifier,
            'dot-inode': inode
        };

        const editButtonClass = canEdit ? 'dotedit-contentlet__edit' : 'dotedit-contentlet__edit dotedit-contentlet__disabled';

        return `${this.dotDOMHtmlUtilService.getButtomHTML(this.dragLabel, 'dotedit-contentlet__drag', dataset)}
            ${this.dotDOMHtmlUtilService.getButtomHTML(this.editLabel, editButtonClass, dataset)}
            ${this.dotDOMHtmlUtilService.getButtomHTML(this.removeLabel, 'dotedit-contentlet__remove', dataset)}`;
    }

    private getContainerToolbarHtml(langMessages: string[], container: HTMLElement, isContainerDisabled: boolean): string {
        let result = `
            <button
                type="button"
                role="button"
                class="dotedit-container__add"
                aria-label="${langMessages['editpage.content.container.action.add']}"
                data-dot-identifier="${container.dataset.dotIdentifier}"
                ${isContainerDisabled ? 'disabled' : ''}>
                ${langMessages['editpage.content.container.action.add']}
            </button>
        `;

        if (!isContainerDisabled) {
            result += `<div class="dotedit-container__menu">
                    <ul>
                        <li class="dotedit-container__menu-item">
                            <a
                                data-dot-add="content"
                                data-dot-identifier="${container.dataset.dotIdentifier}"
                                data-dot-uuid="${container.dataset.dotUuid}"
                                role="button">
                                ${langMessages['editpage.content.container.menu.content']}
                            </a>
                        </li>
                        <li class="dotedit-container__menu-item">
                            <a
                                data-dot-add="widget"
                                data-dot-identifier="${container.dataset.dotIdentifier}"
                                data-dot-uuid="${container.dataset.dotUuid}"
                                role="button">
                                ${langMessages['editpage.content.container.menu.widget']}
                            </a>
                        </li>
                        <li class="dotedit-container__menu-item">
                            <a
                                data-dot-add="form"
                                data-dot-identifier="${container.dataset.dotIdentifier}"
                                data-dot-uuid="${container.dataset.dotUuid}"
                                role="button">
                                ${langMessages['editpage.content.container.menu.form']}
                            </a>
                        </li>
                    </ul>
                </div>
            `;
        }

        return result;
    }
}
