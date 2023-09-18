import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, ViewChild } from '@angular/core';
import { IDatasource, IGetRowsParams } from 'ag-grid-community';
import { Subject, debounceTime } from 'rxjs';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('agGrid', { static: true }) agGrid: any;

  private gridFilterSubject: Subject<string> = new Subject();
  gridState = { filter: '', sortModel: '', rowIndex: 0, unid: '', total: 0 };
  gridOptions = {};

  constructor(private http: HttpClient) {

    // column definition and grid setup
    this.gridOptions = {
      columnDefs: [
        { headerName: 'First name', field: 'firstname', width: 110, suppressFilter: true },
        { headerName: 'Last name', field: 'lastname', suppressFilter: true },
        { headerName: 'Street', field: 'street', width: 110, suppressFilter: true },
        { headerName: 'City', field: 'city', width: 110, suppressFilter: true },
        { headerName: 'Email', field: 'email', width: 110, suppressFilter: true }
      ],
      defaultColDef: {
        sortable: true
      },
      components: {
        loadingRenderer: function (params: any) {
          if (params.value !== undefined) {
            return params.value;
          } else {
            return '<img src="assets/loading.gif">';
          }
        }
      },
      rowSelection: 'single',
      rowBuffer: 0,
      rowModelType: 'infinite',
      cacheOverflowSize: 2,
      maxConcurrentDatasourceRequests: 1,
      infiniteInitialRowCount: 500,
      cacheBlockSize: 100,
      enableServerSideSorting: true
    };

  }
  onGridReady() {

    this.agGrid.api.sizeColumnsToFit();

    // set up the datasource for the grid
    const dataSource = new ContactsDatasource(this.http, this.gridState);
    this.agGrid.api.setDatasource(dataSource);

  }

  ngOnInit() {

    // initialize gridFilter Subject for a debounce on entering a filter value

    this.gridFilterSubject.pipe(
      debounceTime(400)
    ).subscribe(filterValue => {
      // on filter change, we scroll to the top of the list and clear all data
      this.agGrid.api.ensureIndexVisible(0, 'top');
      this.agGrid.api.purgeInfiniteCache();

      // update grid state
      this.gridState.rowIndex = 0;
    });

  }

  // called when a new values is entered in the filter box
  onGridFilterChanged() {
    this.gridFilterSubject.next(this.gridState.filter);
  }

  // called when the filter is 'cleared'
  resetFilter() {
    this.gridState.filter = '';
    this.onGridFilterChanged();
  }

  // called when the sort order has change (clicking on the column)
  // persist sort order, scroll to top
  onGridSortChanged() {
    //this.gridState.sortModel = this.agGrid.api.getSortModel();
    this.gridState.rowIndex = 0;
    this.agGrid.api.ensureIndexVisible(0, 'top');
  }
}

export class ContactsDatasource implements IDatasource {

  constructor(private http: HttpClient,
    private gridFilter: any) {
  }

  getRows(params: IGetRowsParams): void {
    // function called when the grid asks for data
    // includes start index, number of rows,
    // sort col/ order, filter option

    const count = params.endRow - params.startRow;

    // add start/ count params
    const httpOptions = {
      params: new HttpParams()
        .set('start', (params.startRow + 1) + '')
        .set('count', count + '')
        .set('sortCol', '')
        .set('sortAsc', true)
        .set('filter', '')
    };

    // add sort parameters
    if (params.sortModel && params.sortModel.length > 0) {
      const first = params.sortModel[0];
      httpOptions.params.set('sortCol', first.colId);


      // firs.sort = 'asc' or 'desc'
      httpOptions.params.set('sortAsc', first.sort === 'asc');

    }

    // add filter
    if (this.gridFilter.filter) {
      httpOptions.params.set('filter', this.gridFilter.filter);

    }

    this.http
      .get(environment.endpoint + '/contacts', httpOptions)
      .subscribe((res: any) => {
        const data = res['entries'];

        let lastRow = -1;
        if (data.length < count) {
          // api returned fewer results than asked for: must be the end of the data
          // set the index of the last result
          lastRow = params.startRow + data.length;
        }

        this.gridFilter.total = res['total'];

        params.successCallback(data, lastRow);
      });

  }


}
