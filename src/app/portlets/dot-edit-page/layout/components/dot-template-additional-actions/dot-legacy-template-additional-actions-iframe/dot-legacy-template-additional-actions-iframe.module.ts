import { NgModule } from '@angular/core';
import { DotMenuService } from '../../../../../../api/services/dot-menu.service';
import { IFrameModule } from '../../../../../../view/components/_common/iframe/iframe.module';
import { DotLegacyTemplateAdditionalActionsComponent } from './dot-legacy-template-additional-actions-iframe.component';
import { CommonModule } from '@angular/common';

@NgModule({
    declarations: [DotLegacyTemplateAdditionalActionsComponent],
    imports: [IFrameModule, CommonModule],
    exports: [DotLegacyTemplateAdditionalActionsComponent],
    providers: [DotMenuService]
})
export class DotTemplateAdditionalActionsIframeModule {}
