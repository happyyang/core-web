import {
    Component,
    ElementRef,
    ViewEncapsulation,
    OnInit,
    Input,
    ViewChild,
    Output,
    EventEmitter
} from '@angular/core';
import { LoginService, LoggerService } from 'dotcms-js/dotcms-js';
import { Observable } from 'rxjs/Observable';
import { DotLoadingIndicatorService } from '../dot-loading-indicator/dot-loading-indicator.service';
import { IframeOverlayService } from '../service/iframe-overlay.service';
import { DotIframeService } from '../service/dot-iframe/dot-iframe.service';

@Component({
    encapsulation: ViewEncapsulation.Emulated,
    selector: 'dot-iframe',
    styleUrls: ['./iframe.component.scss'],
    templateUrl: 'iframe.component.html'
})
export class IframeComponent implements OnInit {
    @ViewChild('iframeElement') iframeElement: ElementRef;
    @Input() src: string;
    @Input() isLoading = false;
    @Output() load: EventEmitter<any> = new EventEmitter();

    showOverlay = false;

    constructor(
        private element: ElementRef,
        private loggerService: LoggerService,
        private loginService: LoginService,
        private dotIframeService: DotIframeService,
        public dotLoadingIndicatorService: DotLoadingIndicatorService,
        public iframeOverlayService: IframeOverlayService
    ) {}

    ngOnInit(): void {
        this.iframeOverlayService.overlay.subscribe((val) => (this.showOverlay = val));
        this.element.nativeElement.style.height = this.getIframeHeight(window.innerHeight);

        this.dotIframeService.reloaded().subscribe(() => {
            if (this.getIframeWindow()) {
                this.getIframeLocation().reload();
            }
        });

        Observable.fromEvent(window, 'resize')
            .debounceTime(250)
            .subscribe(($event: any) => {
                this.element.nativeElement.style.height = this.getIframeHeight($event.target.innerHeight);
            });
    }

    /**
     * Validate if the iframe window is send to the login page after jsessionid expired
     * then logout the user from angular session
     *
     * @memberof IframeComponent
     */
    checkSessionExpired(): void {
        if (!!this.getIframeWindow() && this.getIframeLocation().pathname.indexOf('/c/portal_public/login') !== -1) {
            this.loginService.logOutUser().subscribe(
                (_data) => {},
                (error) => {
                    this.loggerService.error(error);
                }
            );
        }
    }

    /**
     * Called when iframe load event happen.
     *
     * @param {any} $event
     * @memberof IframeComponent
     */
    onLoad($event): void {
        this.dotLoadingIndicatorService.hide();

        if (this.isIframeHaveContent()) {
            this.load.emit($event);
        }
    }

    private getIframeWindow() {
        return this.iframeElement && this.iframeElement.nativeElement.contentWindow;
    }

    private getIframeLocation(): any {
        return this.iframeElement.nativeElement.contentWindow.location;
    }

    private getIframeHeight(height: number): string {
        // TODO there is a weird 4px bug here that make unnecessary scroll, need to look into it.
        return height - 64 + 'px';
    }

    private isIframeHaveContent(): boolean {
        return this.iframeElement && this.iframeElement.nativeElement.contentWindow.document.body.innerHTML.length;
    }
}
