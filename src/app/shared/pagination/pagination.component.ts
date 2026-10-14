import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (totalPages > 1) {
      <nav class="pagination" aria-label="التنقل بين الصفحات">
        <button
          type="button"
          class="page-btn nav-btn"
          (click)="go(pageNumber - 1)"
          [disabled]="pageNumber === 1"
          aria-label="السابق"
        >
          <mat-icon>chevron_right</mat-icon>
        </button>

        @for (p of pages; track $index) {
          @if (p === '...') {
            <span class="dots">…</span>
          } @else {
            <button
              type="button"
              class="page-btn"
              [class.active]="p === pageNumber"
              (click)="go(p)"
            >
              {{ p }}
            </button>
          }
        }

        <button
          type="button"
          class="page-btn nav-btn"
          (click)="go(pageNumber + 1)"
          [disabled]="pageNumber === totalPages"
          aria-label="التالي"
        >
          <mat-icon>chevron_left</mat-icon>
        </button>
      </nav>
    }
  `,
  styles: [`
    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 28px;
    }

    .page-btn {
      min-width: 40px;
      height: 40px;
      padding: 0 10px;
      border: 1px solid #d9e4f2;
      border-radius: 10px;
      background: #fff;
      color: #1f3b5b;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      transition: 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .page-btn:hover:not(:disabled):not(.active) {
      background: #eef4ff;
    }

    .page-btn.active {
      background: var(--main-color);
      border-color: var(--main-color);
      color: #fff;
      cursor: default;
    }

    .page-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .dots {
      min-width: 24px;
      text-align: center;
      color: #8a97a8;
      font-weight: 700;
    }
  `],
})
export class PaginationComponent {
  @Input() pageNumber = 1;
  @Input() totalPages = 0;
  @Output() pageChange = new EventEmitter<number>();

  get pages(): (number | '...')[] {
    const total = this.totalPages;
    const cur = this.pageNumber;

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    // 1 2 3 4 5 6 7 ... 18
    if (cur <= 4) {
      return [1, 2, 3, 4, 5, 6, 7, '...', total];
    }
    // 1 ... 12 13 14 15 16 17 18
    if (cur >= total - 3) {
      return [1, '...', total - 6, total - 5, total - 4, total - 3, total - 2, total - 1, total];
    }
    // 1 ... 8 9 10 11 12 ... 18
    return [1, '...', cur - 2, cur - 1, cur, cur + 1, cur + 2, '...', total];
  }

  go(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.pageNumber) return;
    this.pageChange.emit(page);
  }
}