document.addEventListener('DOMContentYear', function() {
    // Set current year in footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // DOM Elements
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const startProcessBtn = document.getElementById('startProcess');
    const pauseProcessBtn = document.getElementById('pauseProcess');
    const progressSection = document.getElementById('progressSection');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const processedCount = document.getElementById('processedCount');
    const currentNumber = document.getElementById('currentNumber');
    const latestResult = document.getElementById('latestResult');
    const resultsSection = document.getElementById('resultsSection');
    const resultsBody = document.getElementById('resultsBody');
    const downloadCSVBtn = document.getElementById('downloadCSV');
    const downloadJSONBtn = document.getElementById('downloadJSON');
    const clearResultsBtn = document.getElementById('clearResults');
    const totalNumbers = document.getElementById('totalNumbers');
    const completedNumbers = document.getElementById('completedNumbers');
    const dncCount = document.getElementById('dncCount');
    const detailsCount = document.getElementById('detailsCount');
    const apiStatus = document.getElementById('apiStatus').querySelector('.status-indicator');
    
    // Global variables
    let phoneNumbers = [];
    let results = [];
    let currentIndex = 0;
    let isProcessing = false;
    let isPaused = false;
    let totalProcessed = 0;
    let totalDNC = 0;
    let totalWithDetails = 0;
    
    // Check API status on page load
    checkAPIStatus();
    
    // File upload handling
    uploadArea.addEventListener('click', () => fileInput.click());
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // Process control buttons
    startProcessBtn.addEventListener('click', startProcessing);
    pauseProcessBtn.addEventListener('click', togglePause);
    downloadCSVBtn.addEventListener('click', downloadCSV);
    downloadJSONBtn.addEventListener('click', downloadJSON);
    clearResultsBtn.addEventListener('click', clearResults);
    
    // Handle file upload
    function handleFileUpload(file) {
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        if (!['txt', 'csv'].includes(fileExtension)) {
            alert('Please upload a .txt or .csv file');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            parsePhoneNumbers(content);
        };
        
        reader.readAsText(file);
    }
    
    // Parse phone numbers from file content
    function parsePhoneNumbers(content) {
        // Remove any non-digit characters and split by new lines
        const lines = content.split('\n');
        phoneNumbers = [];
        
        lines.forEach(line => {
            // Extract all 10-digit numbers from the line
            const numbers = line.match(/\b\d{10}\b/g);
            if (numbers) {
                phoneNumbers.push(...numbers);
            }
        });
        
        // Remove duplicates
        phoneNumbers = [...new Set(phoneNumbers)];
        
        if (phoneNumbers.length === 0) {
            alert('No valid 10-digit phone numbers found in the file.');
            return;
        }
        
        // Update UI
        uploadArea.innerHTML = `
            <i class="fas fa-file-check" style="color: var(--success-color)"></i>
            <h3>File Uploaded Successfully!</h3>
            <p>Found ${phoneNumbers.length} unique phone numbers</p>
            <div class="file-format">
                <p><strong>Sample numbers:</strong> ${phoneNumbers.slice(0, 3).join(', ')}${phoneNumbers.length > 3 ? '...' : ''}</p>
            </div>
        `;
        
        startProcessBtn.disabled = false;
        totalNumbers.textContent = phoneNumbers.length;
    }
    
    // Start processing phone numbers
    function startProcessing() {
        if (phoneNumbers.length === 0) {
            alert('Please upload a file with phone numbers first.');
            return;
        }
        
        isProcessing = true;
        isPaused = false;
        startProcessBtn.disabled = true;
        progressSection.style.display = 'block';
        resultsSection.style.display = 'block';
        
        // Reset counters
        currentIndex = 0;
        totalProcessed = 0;
        totalDNC = 0;
        totalWithDetails = 0;
        results = [];
        resultsBody.innerHTML = '';
        
        updateProgress();
        processNextNumber();
    }
    
    // Toggle pause/resume
    function togglePause() {
        if (!isProcessing) return;
        
        isPaused = !isPaused;
        
        if (isPaused) {
            pauseProcessBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            pauseProcessBtn.classList.remove('btn-secondary');
            pauseProcessBtn.classList.add('btn-success');
        } else {
            pauseProcessBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            pauseProcessBtn.classList.remove('btn-success');
            pauseProcessBtn.classList.add('btn-secondary');
            processNextNumber();
        }
    }
    
    // Process next phone number
    function processNextNumber() {
        if (!isProcessing || isPaused || currentIndex >= phoneNumbers.length) {
            if (currentIndex >= phoneNumbers.length) {
                finishProcessing();
            }
            return;
        }
        
        const phoneNumber = phoneNumbers[currentIndex];
        currentNumber.textContent = formatPhoneNumber(phoneNumber);
        
        // Update progress
        updateProgress();
        
        // Process the number (simulate API call with delay)
        checkPhoneNumber(phoneNumber).then(result => {
            // Add to results
            results.push(result);
            addResultToTable(result);
            
            // Update counters
            totalProcessed++;
            
            if (result.dncStatus === 'Yes') {
                totalDNC++;
            }
            
            if (result.name && result.name !== 'Not Found') {
                totalWithDetails++;
            }
            
            // Update summary
            completedNumbers.textContent = totalProcessed;
            dncCount.textContent = totalDNC;
            detailsCount.textContent = totalWithDetails;
            
            // Show latest result
            latestResult.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
            
            // Move to next number
            currentIndex++;
            
            // Add delay to ensure proper checking (simulate slower processing)
            setTimeout(() => {
                processNextNumber();
            }, 1000); // 1 second delay between requests
        }).catch(error => {
            console.error('Error checking number:', error);
            
            // Add error result
            const errorResult = {
                phone: phoneNumber,
                error: true,
                message: 'Failed to retrieve data'
            };
            
            results.push(errorResult);
            addResultToTable(errorResult);
            
            // Update counters
            totalProcessed++;
            completedNumbers.textContent = totalProcessed;
            
            // Move to next number
            currentIndex++;
            
            // Continue with next number after delay
            setTimeout(() => {
                processNextNumber();
            }, 1000);
        });
    }
    
    // Check phone number using the API (via proxy)
    async function checkPhoneNumber(phoneNumber) {
        const checkDNC = document.getElementById('checkDNC').checked;
        const checkDetails = document.getElementById('checkDetails').checked;
        
        let result = {
            phone: phoneNumber,
            dncStatus: 'Unknown',
            ndnc: 'Unknown',
            sdnc: 'Unknown',
            state: 'Unknown',
            name: 'Not Found',
            address: 'Not Found',
            status: 'Unknown',
            error: false
        };
        
        try {
            // Check DNC status (first API)
            if (checkDNC) {
                const dncResponse = await fetch(`proxy.php?endpoint=tcpa&phone=${phoneNumber}`);
                if (dncResponse.ok) {
                    const dncData = await dncResponse.json();
                    
                    if (dncData.status === 'ok') {
                        result.dncStatus = dncData.listed === 'No' ? 'No' : 'Yes';
                        result.ndnc = dncData.ndnc || 'Unknown';
                        result.sdnc = dncData.sdnc || 'Unknown';
                        result.state = dncData.state || 'Unknown';
                    }
                }
            }
            
            // Check details (second API)
            if (checkDetails) {
                const detailsResponse = await fetch(`proxy.php?endpoint=details&phone=${phoneNumber}`);
                if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    
                    if (detailsData.status === 'ok') {
                        if (detailsData.person && detailsData.person.length > 0) {
                            const person = detailsData.person[0];
                            result.name = person.name || 'Not Found';
                            result.status = person.status || 'Unknown';
                            
                            if (person.addresses && person.addresses.length > 0) {
                                const address = person.addresses[0];
                                result.address = `${address.home || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim();
                            }
                        }
                    }
                }
            }
        } catch (error) {
            console.error('API error:', error);
            result.error = true;
            result.message = 'API request failed';
        }
        
        return result;
    }
    
    // Update progress bar and text
    function updateProgress() {
        const progress = ((currentIndex + 1) / phoneNumbers.length) * 100;
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        processedCount.textContent = `${currentIndex + 1} of ${phoneNumbers.length} numbers processed`;
    }
    
    // Finish processing
    function finishProcessing() {
        isProcessing = false;
        pauseProcessBtn.style.display = 'none';
        
        // Show completion message
        latestResult.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success-color); margin-bottom: 10px;"></i>
                <h3>Processing Complete!</h3>
                <p>All ${phoneNumbers.length} phone numbers have been checked.</p>
            </div>
        `;
        
        // Enable download buttons
        downloadCSVBtn.disabled = false;
        downloadJSONBtn.disabled = false;
    }
    
    // Add result to table
    function addResultToTable(result) {
        const row = document.createElement('tr');
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(result.phone);
        
        // Determine DNC status color
        const dncClass = result.dncStatus === 'Yes' ? 'dnc-yes' : 'dnc-no';
        
        row.innerHTML = `
            <td>${formattedPhone}</td>
            <td class="${dncClass}">${result.dncStatus}</td>
            <td>${result.ndnc}</td>
            <td>${result.sdnc}</td>
            <td>${result.state}</td>
            <td>${result.name}</td>
            <td>${result.address}</td>
            <td>${result.status}</td>
        `;
        
        resultsBody.appendChild(row);
    }
    
    // Download CSV
    function downloadCSV() {
        if (results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const headers = ['Phone Number', 'DNC Status', 'NDNC', 'SDNC', 'State', 'Name', 'Address', 'Status'];
        const csvRows = [headers.join(',')];
        
        results.forEach(result => {
            const row = [
                formatPhoneNumber(result.phone),
                result.dncStatus,
                result.ndnc,
                result.sdnc,
                result.state,
                `"${result.name}"`,
                `"${result.address}"`,
                result.status
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-check-results-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Download JSON
    function downloadJSON() {
        if (results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const jsonContent = JSON.stringify(results, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-check-results-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    // Clear results
    function clearResults() {
        if (isProcessing) {
            alert('Cannot clear results while processing is in progress.');
            return;
        }
        
        if (confirm('Are you sure you want to clear all results?')) {
            results = [];
            phoneNumbers = [];
            resultsBody.innerHTML = '';
            uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload Phone Numbers File</h3>
                <p>Drag & drop a .txt or .csv file with phone numbers (one per line) or click to browse</p>
                <input type="file" id="fileInput" accept=".txt,.csv">
                <div class="file-format">
                    <p><strong>File format:</strong> One phone number per line (10 digits, no formatting)</p>
                    <p>Example: 4045093823, 4045094083, 1234567890</p>
                </div>
            `;
            progressSection.style.display = 'none';
            resultsSection.style.display = 'none';
            startProcessBtn.disabled = true;
            
            // Reset counters
            totalNumbers.textContent = '0';
            completedNumbers.textContent = '0';
            dncCount.textContent = '0';
            detailsCount.textContent = '0';
        }
    }
    
    // Format phone number as (XXX) XXX-XXXX
    function formatPhoneNumber(phone) {
        const cleaned = phone.toString().replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }
        return phone;
    }
    
    // Check API status
    async function checkAPIStatus() {
        try {
            const response = await fetch('proxy.php?endpoint=status');
            if (response.ok) {
                apiStatus.classList.remove('offline');
                apiStatus.classList.add('online');
                apiStatus.textContent = 'Online';
            } else {
                throw new Error('API not responding');
            }
        } catch (error) {
            apiStatus.classList.remove('online');
            apiStatus.classList.add('offline');
            apiStatus.textContent = 'Offline';
        }
    }
});
