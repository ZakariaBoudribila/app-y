import { Component } from '@angular/core';
import { ConfirmService } from '../../services/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.css']
})
export class ConfirmDialogComponent {
  readonly request$ = this.confirmService.request$;

  constructor(private confirmService: ConfirmService) {}

  cancel() {
    this.confirmService.resolve(false);
  }

  confirm() {
    this.confirmService.resolve(true);
  }
}
