import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { GoalGroup } from '../../models/goal.model';
import { GoalsService } from '../../services/goals.service';
import { ToastService } from '../../services/toast.service';

export interface GroupModalData {
  mode: 'create' | 'edit';
  group?: GoalGroup;
}

@Component({
  selector: 'app-group-modal',
  standalone: true,
  imports: [FormsModule, FaIconComponent],
  templateUrl: './group-modal.component.html',
  styleUrl: './group-modal.component.css'
})
export class GroupModalComponent {
  private readonly goalsService = inject(GoalsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GroupModalComponent>);
  private readonly data = inject<GroupModalData>(MAT_DIALOG_DATA, { optional: true }) ?? { mode: 'create' };

  protected readonly isEdit = this.data.mode === 'edit';
  protected readonly faClose = faXmark;

  name = this.data.group?.name ?? '';

  close(): void {
    this.dialogRef.close();
  }

  submit(): void {
    const name = this.name.trim();
    if (!name) return;

    if (this.isEdit && this.data.group) {
      this.goalsService.renameGroup(this.data.group.id, name);
      this.toast.show('Group renamed');
    } else {
      this.goalsService.createGroup(name);
      this.toast.show('Group created');
    }

    this.dialogRef.close();
  }
}
