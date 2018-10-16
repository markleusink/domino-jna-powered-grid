import { Component, OnInit, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { IDatasource, IGetRowsParams } from 'ag-grid-community';
import { AgGridNg2 } from 'ag-grid-angular';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild('agGrid') agGrid: AgGridNg2;

  private gridFilterSubject: Subject<string> = new Subject();
  gridState = { filter: null, sortModel: null, rowIndex: 0, unid: null };
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
      enableColResize: true,
      enableSorting: true,
      enableFilter: false,
      components: {
        loadingRenderer: function (params) {
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
    this.gridState.filter = null;
    this.onGridFilterChanged();
  }

  // called when the sort order has change (clicking on the column)
  // persist sort order, scroll to top
  onGridSortChanged() {
    this.gridState.sortModel = this.agGrid.api.getSortModel();
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
    const httpParams = {
      'start': ((params.startRow + 1) + ''),
      'count': (count + ''),
    };

    // add sort parameters
    if (params.sortModel && params.sortModel.length > 0) {
      const first = params.sortModel[0];
      httpParams['sortCol'] = first.colId;

      // firs.sort = 'asc' or 'desc'
      httpParams['sortAsc'] = first.sort === 'asc';
    }

    // add filter
    if (this.gridFilter.filter) {
      httpParams['filter'] = this.gridFilter.filter;
    }

    this.http
      .get('http://nora.lan/jna/jna-demo.nsf/api.xsp/contacts', {
        'params': httpParams
      })
      .subscribe(res => {
        const data = res['entries'];

        let lastRow = -1;
        if (data.length < count) {
          lastRow = data.length;
        }

        this.gridFilter.numResults = res['total'];

        params.successCallback(data, lastRow);
      });

  }

}
