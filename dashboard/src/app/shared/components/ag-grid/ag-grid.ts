import {
  ColDef,
  Module,
  ClientSideRowModelModule,
  DateFilterModule,
  NumberFilterModule,
  PaginationModule,
  TextFilterModule,
  themeQuartz,
  iconSetMaterial,
  GridOptions,
  SelectionChangedEvent,
} from 'ag-grid-community';
import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AgGridAngular } from 'ag-grid-angular';

import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
@Component({
  selector: 'app-ag-grid',
  imports: [AgGridAngular],
  templateUrl: './ag-grid.html',
  styleUrl: './ag-grid.scss',
  standalone: true,
})
export class AgGrid implements OnInit {
  @Input({ required: true }) public columnDefinitions!: ColDef[];
  @Input({ required: true }) public rowData!: object[];

  public modules: Module[] = [
    ClientSideRowModelModule,
    DateFilterModule,
    NumberFilterModule,
    PaginationModule,
    TextFilterModule,
  ];

  protected theme = themeQuartz.withPart(iconSetMaterial).withParams({
    accentColor: '#65318E',
    borderColor: '#1C1C1C26',
    browserColorScheme: 'light',
    columnBorder: false,
    fontFamily: {
      googleFont: 'Poppins',
    },
    fontSize: 14,
    foregroundColor: '#1C1C1C',
    headerBackgroundColor: '#FFFFFF',
    headerColumnBorder: false,
    headerColumnResizeHandleHeight: '20%',
    headerFontSize: 16,
    headerFontWeight: 400,
    headerRowBorder: true,
    headerTextColor: '#1C1C1C',
    rowBorder: true,
    rowHoverColor: '#26A8E033',
    wrapperBorder: false,
  });

  protected gridOptions: GridOptions = {
    defaultColDef: {
      flex: 1,
      filter: true,
    },
    domLayout: 'autoHeight',
    pagination: false,
    suppressRowHoverHighlight: false,
    rowSelection: 'single',
    stopEditingWhenCellsLoseFocus: true,
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    ModuleRegistry.registerModules([AllCommunityModule]);

    this.gridOptions.context = {
      router: this.router,
    };
  }

  onSelectionChanged(event: SelectionChangedEvent) {
    const selectedNodes = event.api.getSelectedNodes();
    if (selectedNodes.length > 1) {
      // Deselect all others except the last selected one
      const latest = selectedNodes[selectedNodes.length - 1];
      event.api.deselectAll();
      latest.setSelected(true);
    }
  }
}
