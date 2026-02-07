document.addEventListener('DOMContentLoaded', function() {
    console.log('USA Phone Number DNC Checker - Initializing...');
    
    // Set current year
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    
    // DOM Elements
    const elements = {
        uploadArea: document.getElementById('uploadArea'),
        fileInput: document.getElementById('fileInput'),
        startProcessBtn: document.getElementById('startProcess'),
        pauseProcessBtn: document.getElementById('pauseProcess'),
        cancelProcessBtn: document.getElementById('cancelProcess'),
        skipNumberBtn: document.getElementById('skipNumber'),
        progressSection: document.getElementById('progressSection'),
        progressBar: document.getElementById('progressBar'),
        progressText: document.getElementById('progressText'),
        processedCount: document.getElementById('processedCount'),
        currentNumber: document.getElementById('currentNumber'),
        latestResult: document.getElementById('latestResult'),
        resultsSection: document.getElementById('resultsSection'),
        resultsBody: document.getElementById('resultsBody'),
        downloadCSVBtn: document.getElementById('downloadCSV'),
        downloadJSONBtn: document.getElementById('downloadJSON'),
        clearResultsBtn: document.getElementById('clearResults'),
        searchInput: document.getElementById('searchInput'),
        prevPageBtn: document.getElementById('prevPage'),
        nextPageBtn: document.getElementById('nextPage'),
        pageInfo: document.getElementById('pageInfo'),
        totalNumbers: document.getElementById('totalNumbers'),
        completedNumbers: document.getElementById('completedNumbers'),
        validCount: document.getElementById('validCount'),
        dncCount: document.getElementById('dncCount'),
        detailsCount: document.getElementById('detailsCount'),
        failedCount: document.getElementById('failedCount'),
        processingSpeed: document.getElementById('processingSpeed'),
        processingETA: document.getElementById('processingETA'),
        processingTime: document.getElementById('processingTime'),
        totalTime: document.getElementById('totalTime'),
        apiStatus: document.getElementById('apiStatus'),
        refreshStatusBtn: document.getElementById('refreshStatus'),
        viewLogsBtn: document.getElementById('viewLogs'),
        logsModal: document.getElementById('logsModal'),
        logsContainer: document.getElementById('logsContainer'),
        clearLogsBtn: document.getElementById('clearLogs'),
        exportLogsBtn: document.getElementById('exportLogs'),
        closeModalBtn: document.querySelector('.close-modal')
    };
    
    // Application State
    const state = {
        phoneNumbers: [],
        results: [],
        filteredResults: [],
        currentIndex: 0,
        isProcessing: false,
        isPaused: false,
        totalProcessed: 0,
        totalValid: 0,
        totalDNC: 0,
        totalWithDetails: 0,
        totalFailed: 0,
        startTime: null,
        processingTimeout: null,
        logs: [],
        currentPage: 1,
        itemsPerPage: 50,
        searchQuery: ''
    };
    
    // Initialize application
    init();
    
    function init() {
        console.log('Initializing application...');
        
        // Setup event listeners
        setupEventListeners();
        
        // Check API status
        checkAPIStatus();
        
        // Load any saved data
        loadSavedData();
        
        console.log('Application initialized successfully');
        addLog('Application initialized', 'info');
    }
    
    function setupEventListeners() {
        // File upload
        if (elements.uploadArea && elements.fileInput) {
            elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
            elements.uploadArea.addEventListener('dragover', handleDragOver);
            elements.uploadArea.addEventListener('dragleave', handleDragLeave);
            elements.uploadArea.addEventListener('drop', handleDrop);
            elements.fileInput.addEventListener('change', handleFileSelect);
        }
        
        // Processing controls
        elements.startProcessBtn.addEventListener('click', startProcessing);
        elements.pauseProcessBtn.addEventListener('click', togglePause);
        elements.cancelProcessBtn.addEventListener('click', cancelProcessing);
        elements.skipNumberBtn.addEventListener('click', skipCurrentNumber);
        
        // Results controls
        elements.downloadCSVBtn.addEventListener('click', downloadCSV);
        elements.downloadJSONBtn.addEventListener('click', downloadJSON);
        elements.clearResultsBtn.addEventListener('click', clearResults);
        elements.searchInput.addEventListener('input', handleSearch);
        elements.prevPageBtn.addEventListener('click', goToPrevPage);
        elements.nextPageBtn.addEventListener('click', goToNextPage);
        
        // Status and logs
        elements.refreshStatusBtn.addEventListener('click', () => checkAPIStatus(true));
        elements.viewLogsBtn.addEventListener('click', showLogsModal);
        elements.clearLogsBtn.addEventListener('click', clearLogs);
        elements.exportLogsBtn.addEventListener('click', exportLogs);
        elements.closeModalBtn.addEventListener('click', closeLogsModal);
        
        // Close modal when clicking outside
        elements.logsModal.addEventListener('click', (e) => {
            if (e.target === elements.logsModal) closeLogsModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
    }
    
    // File handling
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.add('dragover');
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('dragover');
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        elements.uploadArea.classList.remove('dragover');
        
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    }
    
    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    }
    
    function handleFileUpload(file) {
        if (!file) return;
        
        const fileName = file.name;
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        if (!['txt', 'csv'].includes(fileExtension)) {
            alert('Please upload a .txt or .csv file only.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('File is too large. Maximum size is 10MB.');
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            const content = e.target.result;
            parsePhoneNumbers(content, fileName);
        };
        
        reader.onerror = function() {
            alert('Error reading file. Please try again.');
            addLog('Error reading file: ' + fileName, 'error');
        };
        
        reader.readAsText(file);
    }
    
    function parsePhoneNumbers(content, fileName) {
        console.log('Parsing phone numbers from:', fileName);
        
        const lines = content.split('\n');
        const numbers = new Set();
        
        lines.forEach((line, index) => {
            const trimmedLine = line.trim();
            if (!trimmedLine) return;
            
            // Extract all 10-digit numbers
            const matches = trimmedLine.match(/\b\d{10}\b/g);
            if (matches) {
                matches.forEach(match => {
                    if (match.length === 10) {
                        numbers.add(match);
                    }
                });
            }
        });
        
        state.phoneNumbers = Array.from(numbers);
        
        if (state.phoneNumbers.length === 0) {
            alert('No valid 10-digit phone numbers found in the file.');
            addLog('No valid phone numbers found in: ' + fileName, 'warning');
            return;
        }
        
        updateUploadUI(state.phoneNumbers.length, fileName);
        elements.startProcessBtn.disabled = false;
        updateTotalNumbers();
        elements.resultsSection.style.display = 'block';
        
        addLog(`Loaded ${state.phoneNumbers.length} phone numbers from: ${fileName}`, 'success');
    }
    
    function updateUploadUI(count, fileName) {
        elements.uploadArea.innerHTML = `
            <i class="fas fa-file-check" style="color: var(--success-color); font-size: 3.5rem;"></i>
            <h3>File Uploaded Successfully!</h3>
            <p><strong>${fileName}</strong></p>
            <p>${count.toLocaleString()} phone numbers found</p>
            <div class="file-format">
                <p><strong>Sample:</strong> ${state.phoneNumbers.slice(0, 3).map(p => formatPhoneNumber(p)).join(', ')}${count > 3 ? '...' : ''}</p>
                <p><strong>Ready to process.</strong> Click "Start Processing" to begin.</p>
            </div>
            <div class="click-hint">Click to upload different file</div>
            <input type="file" id="fileInput" accept=".txt,.csv">
        `;
        
        // Re-attach file input listener
        const newFileInput = elements.uploadArea.querySelector('#fileInput');
        newFileInput.addEventListener('change', handleFileSelect);
    }
    
    // Processing functions
    function startProcessing() {
        if (state.phoneNumbers.length === 0) {
            alert('Please upload a file with phone numbers first.');
            return;
        }
        
        if (state.isProcessing) return;
        
        console.log('Starting processing of', state.phoneNumbers.length, 'numbers');
        
        // Reset state
        state.isProcessing = true;
        state.isPaused = false;
        state.currentIndex = 0;
        state.totalProcessed = 0;
        state.totalValid = 0;
        state.totalDNC = 0;
        state.totalWithDetails = 0;
        state.totalFailed = 0;
        state.results = [];
        state.filteredResults = [];
        state.startTime = Date.now();
        
        // Reset UI
        elements.resultsBody.innerHTML = '';
        elements.startProcessBtn.disabled = true;
        elements.startProcessBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Processing...';
        elements.progressSection.style.display = 'block';
        elements.pauseProcessBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        elements.pauseProcessBtn.classList.remove('btn-success');
        elements.pauseProcessBtn.classList.add('btn-secondary');
        
        // Reset counters
        updateCounters();
        updateProgress();
        updateProcessingStats();
        
        // Start processing
        processNextNumber();
        
        addLog(`Started processing ${state.phoneNumbers.length.toLocaleString()} phone numbers`, 'success');
    }
    
    function togglePause() {
        if (!state.isProcessing) return;
        
        state.isPaused = !state.isPaused;
        
        if (state.isPaused) {
            elements.pauseProcessBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
            elements.pauseProcessBtn.classList.remove('btn-secondary');
            elements.pauseProcessBtn.classList.add('btn-success');
            addLog('Processing paused', 'warning');
        } else {
            elements.pauseProcessBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
            elements.pauseProcessBtn.classList.remove('btn-success');
            elements.pauseProcessBtn.classList.add('btn-secondary');
            addLog('Processing resumed', 'info');
            processNextNumber();
        }
    }
    
    function cancelProcessing() {
        if (!state.isProcessing) return;
        
        if (confirm('Are you sure you want to cancel processing? All progress will be lost.')) {
            state.isProcessing = false;
            state.isPaused = false;
            
            if (state.processingTimeout) {
                clearTimeout(state.processingTimeout);
                state.processingTimeout = null;
            }
            
            // Reset UI
            elements.startProcessBtn.disabled = false;
            elements.startProcessBtn.innerHTML = '<i class="fas fa-play-circle"></i> Start Processing';
            
            addLog('Processing cancelled by user', 'warning');
        }
    }
    
    function skipCurrentNumber() {
        if (!state.isProcessing || state.currentIndex >= state.phoneNumbers.length) return;
        
        addLog(`Skipped number: ${formatPhoneNumber(state.phoneNumbers[state.currentIndex])}`, 'warning');
        state.currentIndex++;
        processNextNumber();
    }
    
    async function processNextNumber() {
        if (!state.isProcessing || state.isPaused) return;
        
        if (state.currentIndex >= state.phoneNumbers.length) {
            finishProcessing();
            return;
        }
        
        const phoneNumber = state.phoneNumbers[state.currentIndex];
        
        // Update UI
        elements.currentNumber.textContent = formatPhoneNumber(phoneNumber);
        updateProgress();
        updateProcessingStats();
        
        try {
            // Process the number
            const result = await checkPhoneNumber(phoneNumber);
            
            // Update results
            state.results.push(result);
            state.filteredResults.push(result);
            
            // Update counters
            state.totalProcessed++;
            
            if (!result.error) {
                state.totalValid++;
                
                if (result.dncStatus === 'Yes') {
                    state.totalDNC++;
                }
                
                if (result.name && result.name !== 'Not Found') {
                    state.totalWithDetails++;
                }
            } else {
                state.totalFailed++;
            }
            
            // Update UI
            addResultToTable(result, state.results.length);
            updateCounters();
            updateLatestResult(result);
            
            addLog(`Processed: ${formatPhoneNumber(phoneNumber)} - DNC: ${result.dncStatus}`, 'success');
            
        } catch (error) {
            console.error('Error processing number:', error);
            state.totalFailed++;
            state.totalProcessed++;
            
            const errorResult = {
                phone: phoneNumber,
                error: true,
                message: 'Processing failed',
                dncStatus: 'Error',
                ndnc: 'Error',
                sdnc: 'Error',
                state: 'Error',
                name: 'Error',
                address: 'Error',
                status: 'Error'
            };
            
            state.results.push(errorResult);
            state.filteredResults.push(errorResult);
            addResultToTable(errorResult, state.results.length);
            updateCounters();
            
            addLog(`Failed to process: ${formatPhoneNumber(phoneNumber)}`, 'error');
        }
        
        // Move to next number
        state.currentIndex++;
        
        // Add delay for proper checking (1 second as requested)
        state.processingTimeout = setTimeout(() => {
            processNextNumber();
        }, 1000);
    }
    
    async function checkPhoneNumber(phoneNumber) {
        const checkDNC = document.getElementById('checkDNC').checked;
        const checkDetails = document.getElementById('checkDetails').checked;
        
        const result = {
            phone: phoneNumber,
            dncStatus: 'Unknown',
            ndnc: 'Unknown',
            sdnc: 'Unknown',
            state: 'Unknown',
            name: 'Not Found',
            address: 'Not Found',
            status: 'Unknown',
            error: false,
            timestamp: new Date().toISOString()
        };
        
        try {
            // Check DNC status
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
            
            // Check details
            if (checkDetails) {
                const detailsResponse = await fetch(`proxy.php?endpoint=details&phone=${phoneNumber}`);
                if (detailsResponse.ok) {
                    const detailsData = await detailsResponse.json();
                    if (detailsData.status === 'ok' && detailsData.person && detailsData.person.length > 0) {
                        const person = detailsData.person[0];
                        result.name = person.name || 'Not Found';
                        result.status = person.status || 'Unknown';
                        
                        if (person.addresses && person.addresses.length > 0) {
                            const address = person.addresses[0];
                            result.address = `${address.home || ''}, ${address.city || ''}, ${address.state || ''} ${address.zip || ''}`.trim();
                            if (result.address === ',  ') result.address = 'Not Found';
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
    
    function finishProcessing() {
        state.isProcessing = false;
        
        // Calculate total time
        const endTime = Date.now();
        const totalTime = endTime - state.startTime;
        const hours = Math.floor(totalTime / 3600000);
        const minutes = Math.floor((totalTime % 3600000) / 60000);
        const seconds = Math.floor((totalTime % 60000) / 1000);
        
        elements.totalTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Update UI
        elements.startProcessBtn.disabled = false;
        elements.startProcessBtn.innerHTML = '<i class="fas fa-play-circle"></i> Start Processing';
        elements.downloadCSVBtn.disabled = false;
        elements.downloadJSONBtn.disabled = false;
        
        // Update latest result with completion message
        elements.latestResult.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--success-color); margin-bottom: 15px;"></i>
                <h3 style="color: var(--success-color); margin-bottom: 10px;">Processing Complete!</h3>
                <p>Processed ${state.totalProcessed.toLocaleString()} numbers in ${formatTime(totalTime)}</p>
                <p style="font-size: 0.9rem; color: var(--gray-color); margin-top: 10px;">
                    Success: ${state.totalValid} | Failed: ${state.totalFailed} | DNC: ${state.totalDNC}
                </p>
            </div>
        `;
        
        addLog(`Processing completed. Total: ${state.totalProcessed}, Valid: ${state.totalValid}, Failed: ${state.totalFailed}`, 'success');
        addLog(`Total time: ${formatTime(totalTime)}`, 'info');
        
        // Save results
        saveResults();
    }
    
    // UI Update functions
    function updateProgress() {
        const progress = ((state.currentIndex + 1) / state.phoneNumbers.length) * 100;
        elements.progressBar.style.width = `${progress}%`;
        elements.progressText.textContent = `${Math.round(progress)}%`;
        elements.processedCount.textContent = `${state.currentIndex + 1} of ${state.phoneNumbers.length} numbers processed`;
    }
    
    function updateProcessingStats() {
        if (!state.startTime) return;
        
        const currentTime = Date.now();
        const elapsedTime = currentTime - state.startTime;
        const processedCount = state.totalProcessed;
        
        // Calculate speed
        const speed = processedCount > 0 ? (processedCount / (elapsedTime / 1000)).toFixed(2) : 0;
        elements.processingSpeed.textContent = `${speed}/sec`;
        
        // Calculate ETA
        const remaining = state.phoneNumbers.length - state.currentIndex;
        const etaSeconds = speed > 0 ? remaining / speed : 0;
        elements.processingETA.textContent = formatTime(etaSeconds * 1000);
        
        // Update processing time
        const hours = Math.floor(elapsedTime / 3600000);
        const minutes = Math.floor((elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((elapsedTime % 60000) / 1000);
        elements.processingTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    function updateCounters() {
        elements.totalNumbers.textContent = state.phoneNumbers.length.toLocaleString();
        elements.completedNumbers.textContent = state.totalProcessed.toLocaleString();
        elements.validCount.textContent = state.totalValid.toLocaleString();
        elements.dncCount.textContent = state.totalDNC.toLocaleString();
        elements.detailsCount.textContent = state.totalWithDetails.toLocaleString();
        elements.failedCount.textContent = state.totalFailed.toLocaleString();
    }
    
    function updateTotalNumbers() {
        elements.totalNumbers.textContent = state.phoneNumbers.length.toLocaleString();
    }
    
    function updateLatestResult(result) {
        elements.latestResult.innerHTML = `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    }
    
    function addResultToTable(result, index) {
        const row = document.createElement('tr');
        const dncClass = result.dncStatus === 'Yes' ? 'dnc-yes' : 
                        result.dncStatus === 'No' ? 'dnc-no' : '';
        
        row.innerHTML = `
            <td>${index}</td>
            <td><strong>${formatPhoneNumber(result.phone)}</strong></td>
            <td class="${dncClass}">${result.dncStatus}</td>
            <td>${result.ndnc}</td>
            <td>${result.sdnc}</td>
            <td>${result.state}</td>
            <td>${result.name}</td>
            <td>${result.address}</td>
            <td>${result.status}</td>
        `;
        
        elements.resultsBody.appendChild(row);
        
        // Update pagination if needed
        updatePagination();
    }
    
    // Search and pagination
    function handleSearch(e) {
        state.searchQuery = e.target.value.toLowerCase();
        state.currentPage = 1;
        filterResults();
        updatePagination();
    }
    
    function filterResults() {
        if (!state.searchQuery) {
            state.filteredResults = [...state.results];
            return;
        }
        
        state.filteredResults = state.results.filter(result => 
            result.phone.includes(state.searchQuery) ||
            result.name.toLowerCase().includes(state.searchQuery) ||
            result.address.toLowerCase().includes(state.searchQuery) ||
            result.state.toLowerCase().includes(state.searchQuery)
        );
    }
    
    function updatePagination() {
        const totalPages = Math.ceil(state.filteredResults.length / state.itemsPerPage);
        
        elements.pageInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
        elements.prevPageBtn.disabled = state.currentPage <= 1;
        elements.nextPageBtn.disabled = state.currentPage >= totalPages;
        
        // Update table display
        updateTablePage();
    }
    
    function updateTablePage() {
        elements.resultsBody.innerHTML = '';
        
        const startIndex = (state.currentPage - 1) * state.itemsPerPage;
        const endIndex = startIndex + state.itemsPerPage;
        const pageResults = state.filteredResults.slice(startIndex, endIndex);
        
        pageResults.forEach((result, index) => {
            const row = document.createElement('tr');
            const dncClass = result.dncStatus === 'Yes' ? 'dnc-yes' : 
                            result.dncStatus === 'No' ? 'dnc-no' : '';
            
            row.innerHTML = `
                <td>${startIndex + index + 1}</td>
                <td><strong>${formatPhoneNumber(result.phone)}</strong></td>
                <td class="${dncClass}">${result.dncStatus}</td>
                <td>${result.ndnc}</td>
                <td>${result.sdnc}</td>
                <td>${result.state}</td>
                <td>${result.name}</td>
                <td>${result.address}</td>
                <td>${result.status}</td>
            `;
            
            elements.resultsBody.appendChild(row);
        });
    }
    
    function goToPrevPage() {
        if (state.currentPage > 1) {
            state.currentPage--;
            updatePagination();
        }
    }
    
    function goToNextPage() {
        const totalPages = Math.ceil(state.filteredResults.length / state.itemsPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            updatePagination();
        }
    }
    
    // Export functions
    function downloadCSV() {
        if (state.results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const headers = ['Phone Number', 'DNC Status', 'NDNC', 'SDNC', 'State', 'Name', 'Address', 'Status', 'Timestamp'];
        const csvRows = [headers.join(',')];
        
        state.results.forEach(result => {
            const row = [
                formatPhoneNumber(result.phone),
                result.dncStatus,
                result.ndnc,
                result.sdnc,
                result.state,
                `"${(result.name || '').replace(/"/g, '""')}"`,
                `"${(result.address || '').replace(/"/g, '""')}"`,
                result.status,
                result.timestamp
            ];
            csvRows.push(row.join(','));
        });
        
        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-results-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('Exported results as CSV', 'success');
    }
    
    function downloadJSON() {
        if (state.results.length === 0) {
            alert('No results to download.');
            return;
        }
        
        const jsonContent = JSON.stringify(state.results, null, 2);
        const blob = new Blob([jsonContent], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-results-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('Exported results as JSON', 'success');
    }
    
    // Clear functions
    function clearResults() {
        if (state.isProcessing) {
            alert('Cannot clear results while processing.');
            return;
        }
        
        if (confirm('Are you sure you want to clear all results? This action cannot be undone.')) {
            state.phoneNumbers = [];
            state.results = [];
            state.filteredResults = [];
            state.currentIndex = 0;
            state.totalProcessed = 0;
            state.totalValid = 0;
            state.totalDNC = 0;
            state.totalWithDetails = 0;
            state.totalFailed = 0;
            
            // Reset UI
            elements.resultsBody.innerHTML = '';
            elements.uploadArea.innerHTML = `
                <i class="fas fa-cloud-upload-alt"></i>
                <h3>Upload Phone Numbers File</h3>
                <p>Drag & drop a .txt or .csv file with phone numbers (one per line) or click to browse</p>
                <input type="file" id="fileInput" accept=".txt,.csv">
                <div class="file-format">
                    <p><strong>File format:</strong> One phone number per line (10 digits, no formatting)</p>
                    <p>Example: 4045093823, 4045094083, 1234567890</p>
                </div>
                <div class="click-hint">Click to upload</div>
            `;
            
            elements.progressSection.style.display = 'none';
            elements.resultsSection.style.display = 'none';
            elements.startProcessBtn.disabled = true;
            elements.downloadCSVBtn.disabled = true;
            elements.downloadJSONBtn.disabled = true;
            
            updateCounters();
            
            // Re-attach file input listener
            const newFileInput = elements.uploadArea.querySelector('#fileInput');
            newFileInput.addEventListener('change', handleFileSelect);
            
            addLog('All results cleared', 'warning');
        }
    }
    
    // Logs functions
    function addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            timestamp,
            message,
            type
        };
        
        state.logs.push(logEntry);
        
        // Keep only last 1000 logs
        if (state.logs.length > 1000) {
            state.logs.shift();
        }
        
        // Update logs display if modal is open
        if (elements.logsModal.style.display === 'flex') {
            updateLogsDisplay();
        }
    }
    
    function updateLogsDisplay() {
        elements.logsContainer.innerHTML = '';
        
        state.logs.slice().reverse().forEach(log => {
            const logElement = document.createElement('div');
            logElement.className = `log-entry log-${log.type}`;
            logElement.innerHTML = `
                <span class="log-time">${log.timestamp}</span>
                <span class="log-message">${log.message}</span>
            `;
            elements.logsContainer.appendChild(logElement);
        });
    }
    
    function showLogsModal() {
        elements.logsModal.style.display = 'flex';
        updateLogsDisplay();
    }
    
    function closeLogsModal() {
        elements.logsModal.style.display = 'none';
    }
    
    function clearLogs() {
        if (confirm('Clear all logs?')) {
            state.logs = [];
            updateLogsDisplay();
            addLog('Logs cleared', 'warning');
        }
    }
    
    function exportLogs() {
        const logContent = state.logs.map(log => 
            `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
        ).join('\n');
        
        const blob = new Blob([logContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        a.href = url;
        a.download = `dnc-checker-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        addLog('Logs exported', 'success');
    }
    
    // API Status
    async function checkAPIStatus(manual = false) {
        if (manual) {
            elements.apiStatus.textContent = 'Checking...';
            elements.apiStatus.className = 'status-indicator';
        }
        
        try {
            const response = await fetch('proxy.php?endpoint=status');
            if (response.ok) {
                elements.apiStatus.textContent = 'Online';
                elements.apiStatus.className = 'status-indicator online';
                if (manual) addLog('API status: Online', 'success');
            } else {
                throw new Error('API not responding');
            }
        } catch (error) {
            elements.apiStatus.textContent = 'Offline';
            elements.apiStatus.className = 'status-indicator offline';
            if (manual) addLog('API status: Offline', 'error');
        }
    }
    
    // Save/Load functions
    function saveResults() {
        try {
            const data = {
                phoneNumbers: state.phoneNumbers,
                results: state.results,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('dncCheckerResults', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving results:', error);
        }
    }
    
    function loadSavedData() {
        try {
            const saved = localStorage.getItem('dncCheckerResults');
            if (saved) {
                const data = JSON.parse(saved);
                state.phoneNumbers = data.phoneNumbers || [];
                state.results = data.results || [];
                state.filteredResults = [...state.results];
                
                if (state.phoneNumbers.length > 0) {
                    updateUploadUI(state.phoneNumbers.length, 'Previously loaded file');
                    elements.startProcessBtn.disabled = false;
                    updateTotalNumbers();
                    elements.resultsSection.style.display = 'block';
                    
                    // Update counters from saved results
                    state.results.forEach(result => {
                        state.totalProcessed++;
                        if (!result.error) {
                            state.totalValid++;
                            if (result.dncStatus === 'Yes') state.totalDNC++;
                            if (result.name && result.name !== 'Not Found') state.totalWithDetails++;
                        } else {
                            state.totalFailed++;
                        }
                    });
                    
                    updateCounters();
                    updatePagination();
                    
                    addLog(`Loaded ${state.results.length} previously processed results`, 'info');
                }
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }
    
    // Keyboard shortcuts
    function handleKeyboardShortcuts(e) {
        // Ctrl + S to start processing
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (!elements.startProcessBtn.disabled) {
                startProcessing();
            }
        }
        
        // Ctrl + P to pause/resume
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            if (state.isProcessing) {
                togglePause();
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            closeLogsModal();
        }
    }
    
    // Utility functions
    function formatPhoneNumber(phone) {
        if (!phone || typeof phone !== 'string') return 'Invalid';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.length === 10) {
            return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
        }
        return phone;
    }
    
    function formatTime(ms) {
        if (ms < 1000) return '0s';
        
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    // Auto-save every 30 seconds
    setInterval(() => {
        if (state.results.length > 0) {
            saveResults();
        }
    }, 30000);
    
    // Update processing stats every second
    setInterval(() => {
        if (state.isProcessing && !state.isPaused) {
            updateProcessingStats();
        }
    }, 1000);
});
