// printUtils.js

export const handlePrint = (documents, userDepartment) => {
  if (!Array.isArray(documents)) {
    console.warn("No documents array provided to handlePrint. Performing standard window print.");
    window.print();
    return;
  }

  // Define date/time formatting options once
  const optionsDate = { year: 'numeric', month: 'numeric', day: 'numeric' };
  const optionsTime = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true };
  const locale = 'en-PH'; // Specify locale for consistent formatting (Philippines English)

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: sans-serif; margin: 20px; position: relative; }
            h3 { text-align: center; margin-bottom: 10px; }
            .print-info {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 0.9em;
                white-space: nowrap;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                table-layout: fixed;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
                overflow-wrap: break-word;
                word-wrap: break-word;
            }
            th { background-color: #f2f2f2; }
            .signature-row { height: 50px; }
            .datetime-stamp {
                font-size: 0.8em;
                color: #555;
                display: block;
                margin-top: 4px;
            }
            @media print {
                body { -webkit-print-color-adjust: exact; }
            }
        </style>
    </head>
    <body>
        <h3 style="padding-bottom: 30px;">Completed Documents</h3>
        <p class="print-info">Printed by: <strong>${userDepartment || 'N/A'}</strong></p>
        <table>
            <thead>
                <tr>
                    <th>Track Number (Document ID)</th>
                    <th>Description</th>
                    <th>Routed To</th>
                    <th>Remarks</th>
                    <th>Signature</th>
                </tr>
            </thead>
            <tbody>
  `;

  if (documents.length === 0) {
    printContent += `
        <tr>
            <td colspan="5">No completed documents found.</td>
        </tr>
    `;
  } else {
    documents.forEach(doc => {
      let completedDate = 'N/A';
      let completedTime = '';

      // Find the 'Completed' action in the document's history
      const completeEvent = doc.history ? doc.history.find(event => event.action === 'Completed') : null;

      if (completeEvent && completeEvent.date) {
        try {
          const completionDateTime = new Date(completeEvent.date);
          if (!isNaN(completionDateTime.getTime())) {
            completedDate = completionDateTime.toLocaleDateString(locale, optionsDate);
            completedTime = completionDateTime.toLocaleTimeString(locale, optionsTime);
          } else {
            console.warn(`Invalid completion date in history for doc ID ${doc._id}: ${completeEvent.date}`);
          }
        } catch (e) {
          console.error(`Error parsing completion date in history for doc ID ${doc._id}:`, e);
        }
      }

      printContent += `
        <tr>
            <td>${doc._id || 'N/A'}</td>
            <td>${doc.title || 'N/A'}</td>
            <td>
                ${doc.department || 'N/A'}
                <span class="datetime-stamp">${completedDate} ${completedTime}</span>
            </td>
            <td class="remarks"></td>
            <td class="signature-row"></td>
        </tr>
      `;
    });
  }

  printContent += `
            </tbody>
        </table>
    </body>
    </html>
  `;

  const printWindow = window.open('data:text/html,<body style="margin:0;"></body>', '_blank');

  if (printWindow) {
      printWindow.document.title = '';
  }

  setTimeout(() => {
    if (!printWindow || printWindow.closed) {
        console.error("Print window was closed before content could be written.");
        return;
    }

    try {
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();

        printWindow.document.title = '';

        printWindow.onload = () => {
          if (printWindow && printWindow.document) {
              printWindow.document.title = '';
          }
          printWindow.print();
          printWindow.onafterprint = () => printWindow.close();
        };

        if (printWindow.document.readyState === 'complete') {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        }
    } catch (e) {
        console.error("Error writing to print window:", e);
        if (printWindow) printWindow.close();
    }
  }, 10);
};