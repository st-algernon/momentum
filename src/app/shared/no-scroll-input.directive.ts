import { Directive, HostListener } from '@angular/core';

/**
 * Browsers change a focused <input type="number">'s value on mouse-wheel scroll — normal
 * page scrolling silently edits whatever numeric field happens to be focused underneath the
 * cursor. Blurring on wheel loses focus instead, so the scroll just scrolls the page.
 */
@Directive({
  selector: 'input[type="number"]',
  standalone: true
})
export class NoScrollInputDirective {
  @HostListener('wheel', ['$event'])
  protected onWheel(event: WheelEvent): void {
    (event.target as HTMLInputElement).blur();
  }
}
