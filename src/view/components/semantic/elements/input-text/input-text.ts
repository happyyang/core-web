import { NgClass, NgIf, Directive, Component, View, TemplateRef,
    Input,
    Output,
    Validators,
    EventEmitter,
    ElementRef,
    ChangeDetectionStrategy,
    Renderer,
    Self,
    forwardRef,
    Provider,
    NG_VALUE_ACCESSOR,
    ControlValueAccessor} from 'angular2/angular2';

import {isBlank, CONST_EXPR} from 'angular2/src/facade/lang';

const CW_TEXT_VALUE_ACCESSOR = CONST_EXPR(new Provider(
    NG_VALUE_ACCESSOR, {useExisting: forwardRef(() => InputText), multi: true}));

/**
 * Angular 2 wrapper around Semantic UI Input Element.
 * @see http://semantic-ui.com/elements/input.html
 */
@Component({
  selector: 'cw-input-text',
  host: { 'role': 'text' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  bindings: [CW_TEXT_VALUE_ACCESSOR]

})
@View({
  template: `
<div class="ui fluid input" [ngClass]="{disabled: disabled, error: errorMessage, icon: icon}">
  <input type="text" [name]="name" [value]="value" [placeholder]="placeholder" [disabled]="disabled"
    (input)="onChange($event.target.value)"
    (change)="onChange($event.target.value)"
    (blur)="onTouched()">
  <i [ngClass]="icon" *ngIf="icon"></i>
  <div class="ui small red message" *ngIf="errorMessage">{{errorMessage}}</div>
</div>
  `,
  directives: [NgClass, NgIf]
})
export class InputText implements ControlValueAccessor{

  onChange = (_) => {};
  onTouched = () => {};

  @Input()  name:string=""
  @Input()  value:string=""
  @Input()  placeholder:string=""
  @Input()  icon:string
  @Input()  disabled:boolean=false
  @Input()  errorMessage:string
  @Output() change:EventEmitter<any>


  constructor(private _renderer: Renderer, private _elementRef: ElementRef) {
    this.change = new EventEmitter()
  }

  writeValue(value: string): void {
    this.value  = isBlank(value) ? '' : value
    console.log("writing value: ", value,  " ==> ", this.value)
  }

  registerOnChange(fn: (_: any) => void): void {
    this.onChange = (_: any) => {
      console.log("Value changed: ", _)
      fn(_)
    }
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = () => {
      console.log("Touched")
      fn()
    }
  }
}

