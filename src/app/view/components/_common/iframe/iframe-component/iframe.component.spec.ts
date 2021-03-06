import { RouterTestingModule } from '@angular/router/testing';
import { IframeOverlayService } from './../service/iframe-overlay.service';
import { DotLoadingIndicatorService } from './../dot-loading-indicator/dot-loading-indicator.service';
import { DotLoadingIndicatorComponent } from './../dot-loading-indicator/dot-loading-indicator.component';
import { ComponentFixture, async } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';

import { SafePipe } from './../../../../pipes/safe-url.pipe';
import { DOTTestBed } from '../../../../../test/dot-test-bed';
import { IframeComponent } from './iframe.component';
import { LoginService } from 'dotcms-js/core/login.service';
import { LoginServiceMock } from '../../../../../test/login-service.mock';
import { DotIframeService } from '../service/dot-iframe/dot-iframe.service';

describe('IframeComponent', () => {
    let comp: IframeComponent;
    let fixture: ComponentFixture<IframeComponent>;
    let de: DebugElement;
    let iframeEl: DebugElement;
    let dotIframeService: DotIframeService;

    beforeEach(
        async(() => {
            DOTTestBed.configureTestingModule({
                declarations: [IframeComponent, DotLoadingIndicatorComponent, SafePipe],
                imports: [RouterTestingModule],
                providers: [
                    DotLoadingIndicatorService,
                    IframeOverlayService,
                    {
                        provide: LoginService,
                        useClass: LoginServiceMock
                    }
                ]
            });

            fixture = DOTTestBed.createComponent(IframeComponent);
            comp = fixture.componentInstance;
            de = fixture.debugElement;

            dotIframeService = de.injector.get(DotIframeService);

            comp.isLoading = false;
            comp.src = 'etc/etc?hello=world';
            fixture.detectChanges();
            iframeEl = de.query(By.css('iframe'));
        })
    );

    it('should have iframe element', () => {
        expect(iframeEl).toBeTruthy();
    });

    it('should bind src to the iframe', () => {
        expect(iframeEl.properties.src).toContain('');
    });

    it('should reload iframe', () => {
        comp.iframeElement.nativeElement = {
            contentWindow: {
                document: {
                    body: {
                        innerHTML: '<html></html>'
                    }
                },
                location: {
                    reload: jasmine.createSpy('reload')
                }
            }
        };

        dotIframeService.reload();
        expect(comp.iframeElement.nativeElement.contentWindow.location.reload).toHaveBeenCalledTimes(1);
    });

});
