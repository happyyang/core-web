import { DotPage } from './../../../shared/models/dot-page.model';
import { LoginService } from 'dotcms-js/dotcms-js';
import { DotRenderedPageState, DotPageState } from '../../../shared/models/dot-rendered-page-state.model';
import { DotRenderHTMLService } from '../../../../../api/services/dot-render-html/dot-render-html.service';
import { DotRenderedPage } from '../../../shared/models/dot-rendered-page.model';
import { Observable } from 'rxjs/Observable';
import { Injectable } from '@angular/core';
import { DotContentletLockerService } from '../../../../../api/services/dot-contentlet-locker/dot-contentlet-locker.service';
import { DotEditPageViewAs } from '../../../../../shared/models/dot-edit-page-view-as/dot-edit-page-view-as.model';

@Injectable()
export class DotPageStateService {
    constructor(
        private dotRenderHTMLService: DotRenderHTMLService,
        private dotContentletLockerService: DotContentletLockerService,
        private loginService: LoginService
    ) {}

    /**
     * Set the page state
     *
     * @param {DotRenderedPage} page
     * @param {DotEditPageState} state
     * @returns {Observable<any>}
     * @memberof DotRenderHTMLService
     */
    set(page: DotPage, state: DotPageState, viewAs?: DotEditPageViewAs): Observable<DotRenderedPageState> {
        const lockUnlock$: Observable<string> = this.getLockMode(page.workingInode, state.locked);
        const pageOpts = {
            url: page.pageURI,
            mode: state.mode,
            viewAs: viewAs
        };
        const pageMode$: Observable<DotRenderedPage> =
            state.mode !== undefined ? this.dotRenderHTMLService.get(pageOpts) : Observable.of(null);

        return lockUnlock$.mergeMap(() =>
            pageMode$.map(
                (updatedPage: DotRenderedPage) =>
                    new DotRenderedPageState(
                        this.loginService.auth.loginAsUser || this.loginService.auth.user,
                        updatedPage,
                        state.mode
                    )
            )
        );
    }

    /**
     * Get page state
     *
     * @param {string} url
     * @returns {Observable<DotRenderedPageState>}
     * @memberof DotPageStateService
     */
    get(url: string): Observable<DotRenderedPageState> {
        return this.dotRenderHTMLService
            .getEdit(url)
            .map(
                (page: DotRenderedPage) =>
                    new DotRenderedPageState(this.loginService.auth.loginAsUser || this.loginService.auth.user, page)
            );
    }

    private getLockMode(workingInode: string, lock: boolean): Observable<string> {
        if (lock === true) {
            return this.dotContentletLockerService.lock(workingInode).pluck('message');
        } else if (lock === false) {
            return this.dotContentletLockerService.unlock(workingInode).pluck('message');
        }

        return Observable.of(null);
    }
}
