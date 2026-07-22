import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { GoalsService } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './group-modal.component.html',
  styleUrl: './group-modal.component.css'
})
export class GroupModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GroupModalComponent>);

  name = '';

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const name = this.name.trim();
    if (!name) return;

    this.goalsService.createGroup(name);
    this.toast.show('Group created');
    this.dialogRef.close();
  }
}
