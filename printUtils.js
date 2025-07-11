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

  // Use the specific DepEd Laoag logo URL provided
  const logoUrl = "https://th.bing.com/th/id/OIP.-2AiO0ZeIHzRQka5xSe_kgAAAA?w=129&h=150&c=7&r=0&o=7&pid=1.7&rm=3";
  
  // Keep embedded logo as fallback
  const embeddedLogo = `data:image/svg+xml;base64,${btoa(`
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="logoGrad" cx="50%" cy="25%" r="70%">
          <stop offset="0%" style="stop-color:#c41e3a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#8b0000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5a0000;stop-opacity:1" />
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
        </filter>
      </defs>
      
      <!-- Main seal background -->
      <circle cx="30" cy="30" r="28" fill="url(#logoGrad)" stroke="#2c1810" stroke-width="2" filter="url(#shadow)"/>
      
      <!-- Inner decorative circles -->
      <circle cx="30" cy="30" r="23" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.9"/>
      <circle cx="30" cy="30" r="18" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.7"/>
      <circle cx="30" cy="30" r="13" fill="none" stroke="#ffffff" stroke-width="0.8" opacity="0.5"/>
      
      <!-- Top star -->
      <g transform="translate(30,12)">
        <polygon points="0,-4 1.2,-1.2 4,0 1.2,1.2 0,4 -1.2,1.2 -4,0 -1.2,-1.2" fill="#ffd700" stroke="#ff8c00" stroke-width="0.5"/>
        <circle cx="0" cy="0" r="1.5" fill="#ffd700"/>
      </g>
      
      <!-- Main text -->
      <text x="30" y="22" font-family="Arial, sans-serif" font-size="6" fill="white" text-anchor="middle" font-weight="bold" letter-spacing="0.5">DEPED</text>
      <text x="30" y="30" font-family="Arial, sans-serif" font-size="5" fill="white" text-anchor="middle" font-weight="600" letter-spacing="0.3">LAOAG</text>
      <text x="30" y="37" font-family="Arial, sans-serif" font-size="4" fill="white" text-anchor="middle" font-weight="500" letter-spacing="0.2">CITY</text>
      
      <!-- Bottom text -->
      <text x="30" y="44" font-family="Arial, sans-serif" font-size="3" fill="#ffd700" text-anchor="middle" font-weight="400" letter-spacing="0.1">SCHOOLS DIVISION</text>
      
      <!-- Decorative elements -->
      <circle cx="15" cy="30" r="1.5" fill="#ffd700" opacity="0.8"/>
      <circle cx="45" cy="30" r="1.5" fill="#ffd700" opacity="0.8"/>
      <circle cx="30" cy="48" r="1" fill="#ffd700" opacity="0.6"/>
    </svg>
  `)}`;

  const embeddedFooterLogo = `data:image/svg+xml;base64,${btoa(`
    <svg width="35" height="35" viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="footerLogoGrad" cx="50%" cy="25%" r="70%">
          <stop offset="0%" style="stop-color:#c41e3a;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#8b0000;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#5a0000;stop-opacity:1" />
        </radialGradient>
      </defs>
      
      <circle cx="17.5" cy="17.5" r="16" fill="url(#footerLogoGrad)" stroke="#2c1810" stroke-width="1"/>
      <circle cx="17.5" cy="17.5" r="13" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.8"/>
      
      <text x="17.5" y="13" font-family="Arial, sans-serif" font-size="4" fill="white" text-anchor="middle" font-weight="bold">DEPED</text>
      <text x="17.5" y="18.5" font-family="Arial, sans-serif" font-size="3.2" fill="white" text-anchor="middle" font-weight="600">LAOAG</text>
      <text x="17.5" y="23" font-family="Arial, sans-serif" font-size="2.5" fill="white" text-anchor="middle" font-weight="500">CITY</text>
      
      <polygon points="17.5,6 18.5,8.5 16.5,8.5" fill="#ffd700"/>
      <circle cx="17.5" cy="7" r="1" fill="#ffd700"/>
    </svg>
  `)}`;

  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Times:wght@400;500;600;700&display=swap');
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body { 
                font-family: 'Times New Roman', Times, serif;
                margin: 0;
                padding: 20px;
                background: white;
                color: #2c2c2c;
                line-height: 1.2;
                font-size: 11px;
            }
            
            .document-header {
                text-align: center;
                border-bottom: 2px solid #800000;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }
            
            .logo-section {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 15px;
                margin-bottom: 10px;
            }
            
            .logo {
                width: 60px;
                height: 60px;
                border: 2px solid #800000;
                border-radius: 50%;
                padding: 3px;
                display: block !important;
                background-color: #fff;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            }
            
            .header-titles h1 {
                font-size: 16px;
                font-weight: 700;
                color: #800000;
                margin-bottom: 3px;
                text-transform: uppercase;
                letter-spacing: 0.8px;
            }
            
            .header-titles h2 {
                font-size: 13px;
                font-weight: 600;
                color: #2c2c2c;
                margin-bottom: 6px;
            }
            
            .document-title {
                font-size: 15px;
                font-weight: 700;
                color: #800000;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 10px;
            }
            
            .report-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 10px;
                background: #f8f8f8;
                border: 1px solid #ddd;
                border-radius: 3px;
            }
            
            .report-meta {
                font-size: 10px;
                color: #555;
                line-height: 1.4;
            }
            
            .report-meta strong {
                color: #800000;
            }
            
            .document-count {
                font-size: 12px;
                font-weight: 600;
                color: #800000;
                background: white;
                padding: 8px 12px;
                border: 2px solid #800000;
                border-radius: 3px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
                border: 2px solid #800000;
                background: white;
            }
            
            thead {
                background: #800000;
                color: white;
            }
            
            th {
                padding: 8px 6px;
                text-align: center;
                font-weight: 600;
                font-size: 10px;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                border: 1px solid #600000;
            }
            
            tbody tr {
                border-bottom: 1px solid #ddd;
            }
            
            tbody tr:nth-child(even) {
                background: #fafafa;
            }
            
            td {
                padding: 6px 5px;
                border: 1px solid #ddd;
                vertical-align: top;
                font-size: 9px;
                line-height: 1.2;
            }
            
            .doc-id-cell {
                text-align: center;
                font-family: 'Courier New', monospace;
                font-weight: 600;
                background: #f0f0f0;
                color: #800000;
            }
            
            .title-cell {
                font-weight: 600;
                color: #2c2c2c;
            }
            
            .description-cell {
                color: #555;
                text-align: justify;
                max-width: 250px;
                word-wrap: break-word;
            }
            
            .completion-cell {
                text-align: center;
            }
            
            .department-name {
                font-weight: 600;
                color: #800000;
                margin-bottom: 5px;
            }
            
            .completion-date {
                font-size: 8px;
                color: #666;
                font-style: italic;
            }
            
            .remarks-cell {
                background: #fafafa;
                min-height: 30px;
                border: 1px dashed #ccc;
                position: relative;
            }
            
            .signature-cell {
                text-align: center;
                background: #fafafa;
                border: 1px solid #ccc;
                padding: 20px 5px;
                position: relative;
                min-height: 50px;
            }
            
            .signature-line {
                position: absolute;
                bottom: 8px;
                left: 50%;
                transform: translateX(-50%);
                width: 80%;
                border-bottom: 1px solid #666;
                font-size: 7px;
                color: #999;
                text-align: center;
                padding-top: 15px;
            }
            
            .signature-line::after {
                content: "Signature";
                position: absolute;
                bottom: -12px;
                left: 50%;
                transform: translateX(-50%);
                font-size: 6px;
                color: #999;
            }
            
            .cell-label {
                position: absolute;
                top: 1px;
                left: 3px;
                font-size: 7px;
                color: #999;
                text-transform: uppercase;
                font-weight: 500;
            }
            
            .no-documents {
                text-align: center;
                padding: 80px 20px;
                color: #666;
                font-size: 18px;
                font-style: italic;
            }
            
            .document-footer {
                margin-top: 20px;
                border-top: 1px solid #800000;
                padding-top: 15px;
            }
            
            .footer-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .footer-left {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .footer-logo {
                width: 35px;
                height: 35px;
                border: 2px solid #800000;
                border-radius: 50%;
                padding: 2px;
                display: block !important;
                background-color: #fff;
                box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
            }
            
            .footer-text {
                font-size: 8px;
                color: #2c2c2c;
                line-height: 1.3;
            }
            
            .footer-right {
                text-align: right;
                font-size: 7px;
                color: #666;
                line-height: 1.3;
            }
            
            @media print {
                body { 
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    margin: 0;
                    padding: 10px;
                }
                
                .logo, .footer-logo {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                .logo-section {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                
                .report-info {
                    page-break-inside: avoid;
                }
                
                table {
                    page-break-inside: auto;
                }
                
                tr {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
                
                thead {
                    display: table-header-group;
                }
                
                .document-footer {
                    page-break-inside: avoid;
                    margin-top: 15px;
                }
            }
        </style>
    </head>
    <body>
        <div class="document-header">
            <div class="logo-section">
                <img src="${logoUrl}" alt="DepEd Laoag Logo" class="logo" crossorigin="anonymous" onerror="this.src='${embeddedLogo}'; this.onerror=null;" />
                <div class="header-titles">
                    <h1>Republic of the Philippines</h1>
                    <h2>Department of Education</h2>
                    <h2>Schools Division of Laoag City</h2>
                </div>
            </div>
            <div class="document-title">Completed Documents Report</div>
        </div>
        
        <div class="report-info">
            <div class="report-meta">
                <div><strong>Report Generated By:</strong> ${userDepartment || 'N/A'}</div>
                <div><strong>Date Generated:</strong> ${new Date().toLocaleDateString(locale, { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div><strong>Time Generated:</strong> ${new Date().toLocaleTimeString(locale, optionsTime)}</div>
            </div>
            ${documents.length > 0 ? `
            <div class="document-count">
                Total Documents: ${documents.length}
            </div>
            ` : ''}
        </div>
        
        <table>
            <thead>
                <tr>
                    <th style="width: 12%;">Document ID</th>
                    <th style="width: 20%;">Document Title</th>
                    <th style="width: 30%;">Description</th>
                    <th style="width: 18%;">Completion Details</th>
                    <th style="width: 12%;">Remarks</th>
                    <th style="width: 8%;">Signature</th>
                </tr>
            </thead>
            <tbody>
  `;

  if (documents.length === 0) {
    printContent += `
        <tr>
            <td colspan="6" class="no-documents">
                No completed documents found for this reporting period.
            </td>
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
            console.warn(`Invalid completion date in history for doc ID ${doc.documentId}: ${completeEvent.date}`);
          }
        } catch (e) {
          console.error(`Error parsing completion date in history for doc ID ${doc.documentId}:`, e);
        }
      }

      printContent += `
        <tr>
            <td class="doc-id-cell">${doc.documentId || 'N/A'}</td>
            <td class="title-cell">${doc.title || 'Untitled Document'}</td>
            <td class="description-cell">${doc.description || 'No description provided'}</td>
            <td class="completion-cell">
                <div class="department-name">${doc.department || 'Unknown Department'}</div>
                <div class="completion-date">Completed: ${completedDate} ${completedTime}</div>
            </td>
            <td class="remarks-cell">
                <span class="cell-label">Remarks</span>
            </td>
            <td class="signature-cell">
                <div class="signature-line"></div>
            </td>
        </tr>
      `;
    });
  }

  printContent += `
            </tbody>
        </table>
        
        <div class="document-footer">
            <div class="footer-content">
                <div class="footer-left">
                    <img src="${logoUrl}" alt="DepEd Laoag Logo" class="footer-logo" crossorigin="anonymous" onerror="this.src='${embeddedFooterLogo}'; this.onerror=null;" />
                    <div class="footer-text">
                        <strong>Document Tracking System</strong><br>
                        Schools Division of Laoag City<br>
                        © ${new Date().getFullYear()} Department of Education
                    </div>
                </div>
                <div class="footer-right">
                    <strong>Report Reference:</strong> DOC-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}<br>
                    <strong>Generated:</strong> ${new Date().toLocaleDateString(locale, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}<br>
                    <strong>Page:</strong> 1 of 1
                </div>
            </div>
        </div>
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

        // Wait for images to load before printing
        const images = printWindow.document.getElementsByTagName('img');
        let imagesLoaded = 0;
        const totalImages = images.length;

        const checkImagesLoaded = () => {
          if (imagesLoaded >= totalImages || totalImages === 0) {
            // All images loaded or no images, proceed with printing
            setTimeout(() => {
              if (printWindow && !printWindow.closed) {
                printWindow.print();
                printWindow.onafterprint = () => printWindow.close();
              }
            }, 500); // Small delay to ensure rendering is complete
          }
        };

        if (totalImages > 0) {
          Array.from(images).forEach(img => {
            if (img.complete) {
              imagesLoaded++;
            } else {
              img.onload = () => {
                imagesLoaded++;
                checkImagesLoaded();
              };
              img.onerror = () => {
                imagesLoaded++;
                checkImagesLoaded();
              };
            }
          });
          checkImagesLoaded();
        } else {
          checkImagesLoaded();
        }
    } catch (e) {
        console.error("Error writing to print window:", e);
        if (printWindow) printWindow.close();
    }
  }, 100);
};