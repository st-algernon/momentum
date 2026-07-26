import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './progress-ring.component.html',
  styleUrl: './progress-ring.component.css'
})
export class ProgressRingComponent {
  readonly percent = input.required<number>();
  readonly size = input(160);
  readonly label = input('');

  protected readonly strokeWidth = 14;
  protected readonly radius = computed(() => this.size() / 2 - this.strokeWidth / 2);
  protected readonly circumference = computed(() => 2 * Math.PI * this.radius());
  protected readonly dashOffset = computed(() => {
    const clamped = Math.min(100, Math.max(0, this.percent()));
    return this.circumference() * (1 - clamped / 100);
  });
}
