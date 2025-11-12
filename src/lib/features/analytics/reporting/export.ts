import { ReportFormat } from '../models/reports';
import { TimeSeriesData, TimeSeriesDataPoint } from './time-series';
import { MetricComparison } from './comparison';

/**
 * Format number based on locale, unit, decimal places
 * @param value Number to format
 * @param unit Optional unit
 * @param decimalPlaces Number of decimal places
 * @returns Formatted number string
 */
export function formatNumber(value: number, unit?: string, decimalPlaces = 2): string {
  let formatted = '';
  
  // Format the number
  if (Math.abs(value) >= 1000000) {
    formatted = (value / 1000000).toFixed(1) + 'M';
  } else if (Math.abs(value) >= 1000) {
    formatted = (value / 1000).toFixed(1) + 'k';
  } else if (Number.isInteger(value)) {
    formatted = value.toString();
  } else {
    formatted = value.toFixed(decimalPlaces);
  }
  
  // Add unit if provided
  if (unit) {
    if (unit === '%') {
      formatted = formatted + unit;
    } else if (unit === '$' || unit === '€' || unit === '£') {
      formatted = unit + formatted;
    } else {
      formatted = formatted + ' ' + unit;
    }
  }
  
  return formatted;
}

/**
 * Generate CSV content from time series data
 * @param data Time series data
 * @returns CSV content as string
 */
export function generateCSVFromTimeSeries(data: TimeSeriesData): string {
  let csvContent = 'Date,Value';
  
  if (data.data[0]?.previousValue !== undefined) {
    csvContent += ',Previous Value,Change,Change %';
  }
  
  csvContent += '\n';
  
  data.data.forEach(point => {
    let row = `${point.date},${point.value}`;
    
    if (point.previousValue !== undefined) {
      row += `,${point.previousValue},${point.change},${point.changePercentage ? point.changePercentage.toFixed(2) : '0.00'}`;
    }
    
    csvContent += row + '\n';
  });
  
  return csvContent;
}

/**
 * Generate CSV content from metric comparisons
 * @param comparisons Metric comparisons array
 * @returns CSV content as string
 */
export function generateCSVFromComparisons(comparisons: MetricComparison[]): string {
  let csvContent = 'Metric,Current Value,Previous Value,Change,Change %,Trend\n';
  
  comparisons.forEach(comparison => {
    const trend = comparison.trendValuation === 'positive' 
      ? 'Positive' 
      : comparison.trendValuation === 'negative' 
        ? 'Negative' 
        : 'Neutral';
        
    const row = [
      comparison.metricName,
      comparison.current.value,
      comparison.previous.value,
      comparison.change,
      comparison.changePercentage.toFixed(2) + '%',
      trend
    ].join(',');
    
    csvContent += row + '\n';
  });
  
  return csvContent;
}

/**
 * Generate Excel XML content from time series data
 * @param data Time series data
 * @param sheetName Sheet name
 * @returns Excel XML content as string
 */
export function generateExcelXMLFromTimeSeries(
  data: TimeSeriesData,
  sheetName: string = 'Time Series'
): string {
  let excelContent = `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="${sheetName}">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">Date</Data></Cell>
    <Cell><Data ss:Type="String">Value</Data></Cell>`;
    
  if (data.data[0]?.previousValue !== undefined) {
    excelContent += `
    <Cell><Data ss:Type="String">Previous Value</Data></Cell>
    <Cell><Data ss:Type="String">Change</Data></Cell>
    <Cell><Data ss:Type="String">Change %</Data></Cell>`;
  }
    
  excelContent += `
   </Row>`;
  
  data.data.forEach(point => {
    excelContent += `
   <Row>
    <Cell><Data ss:Type="String">${point.date}</Data></Cell>
    <Cell><Data ss:Type="Number">${point.value}</Data></Cell>`;
    
    if (point.previousValue !== undefined) {
      excelContent += `
    <Cell><Data ss:Type="Number">${point.previousValue}</Data></Cell>
    <Cell><Data ss:Type="Number">${point.change || 0}</Data></Cell>
    <Cell><Data ss:Type="Number">${point.changePercentage || 0}</Data></Cell>`;
    }
    
    excelContent += `
   </Row>`;
  });
  
  excelContent += `
  </Table>
 </Worksheet>
</Workbook>`;

  return excelContent;
}

/**
 * Generate JSON output from time series data
 * @param data Time series data
 * @returns JSON string
 */
export function generateJSONFromTimeSeries(data: TimeSeriesData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Generate HTML content from time series data
 * @param data Time series data
 * @param title Report title
 * @returns HTML content as string
 */
export function generateHTMLFromTimeSeries(
  data: TimeSeriesData,
  title: string = 'Time Series Report'
): string {
  let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f2f2f2; }
    tr:hover { background-color: #f5f5f5; }
    .positive { color: green; }
    .negative { color: red; }
    .summary { margin-top: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p>Total: ${formatNumber(data.total, data.unit)}</p>
    <p>Average: ${formatNumber(data.average, data.unit)}</p>
    <p>Min: ${formatNumber(data.min, data.unit)}</p>
    <p>Max: ${formatNumber(data.max, data.unit)}</p>`;
    
  if (data.totalChange !== undefined && data.totalChangePercentage !== undefined) {
    const changeClass = data.totalChange > 0 ? 'positive' : data.totalChange < 0 ? 'negative' : '';
    
    htmlContent += `
    <p>Change: <span class="${changeClass}">${formatNumber(data.totalChange, data.unit)} (${data.totalChangePercentage.toFixed(2)}%)</span></p>`;
  }
    
  htmlContent += `
  </div>
  
  <h2>Data</h2>
  <table>
    <tr>
      <th>Date</th>
      <th>Value</th>`;
      
  if (data.data[0]?.previousValue !== undefined) {
    htmlContent += `
      <th>Previous Value</th>
      <th>Change</th>
      <th>Change %</th>`;
  }
      
  htmlContent += `
    </tr>`;
  
  data.data.forEach(point => {
    let changeClass = '';
    if (point.change !== undefined) {
      changeClass = point.change > 0 ? 'positive' : point.change < 0 ? 'negative' : '';
    }
    
    htmlContent += `
    <tr>
      <td>${point.date}</td>
      <td>${formatNumber(point.value, data.unit)}</td>`;
      
    if (point.previousValue !== undefined) {
      htmlContent += `
      <td>${formatNumber(point.previousValue || 0, data.unit)}</td>
      <td class="${changeClass}">${formatNumber(point.change || 0, data.unit)}</td>
      <td class="${changeClass}">${point.changePercentage ? point.changePercentage.toFixed(2) : '0.00'}%</td>`;
    }
      
    htmlContent += `
    </tr>`;
  });
  
  htmlContent += `
  </table>
</body>
</html>`;

  return htmlContent;
}

/**
 * Export time series data in the specified format
 * @param data Time series data
 * @param format Export format
 * @param title Report title
 * @returns Exported content as string
 */
export function exportTimeSeries(
  data: TimeSeriesData,
  format: ReportFormat,
  title: string = 'Time Series Report'
): string {
  switch (format) {
    case ReportFormat.CSV:
      return generateCSVFromTimeSeries(data);
    case ReportFormat.EXCEL:
      return generateExcelXMLFromTimeSeries(data, title);
    case ReportFormat.JSON:
      return generateJSONFromTimeSeries(data);
    case ReportFormat.HTML:
      return generateHTMLFromTimeSeries(data, title);
    case ReportFormat.PDF:
      // PDF export would typically require server-side processing
      // or a client-side PDF library. Here we just return HTML that
      // could be converted to PDF
      return generateHTMLFromTimeSeries(data, title);
    default:
      return generateCSVFromTimeSeries(data);
  }
}

/**
 * Export metric comparisons in the specified format
 * @param comparisons Metric comparisons
 * @param format Export format
 * @param title Report title
 * @returns Exported content as string
 */
export function exportComparisons(
  comparisons: MetricComparison[],
  format: ReportFormat,
  title: string = 'Metrics Comparison'
): string {
  switch (format) {
    case ReportFormat.CSV:
      return generateCSVFromComparisons(comparisons);
    // Implement other formats as needed
    default:
      return generateCSVFromComparisons(comparisons);
  }
}
