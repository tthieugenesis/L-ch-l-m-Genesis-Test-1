// DÁN URL BẠN VỪA COPY TỪ APPS SCRIPT VÀO ĐÂY
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRyVxBVrgn27vQQTVtOswR7AttTzIIxEBa1VY10qh3kCLA0cKldjL2rkqe-cAPwnlhYQ/exec'; 

// Global variables
let allData = [];
let filteredData = [];

// DOM elements
const gridContainer = document.getElementById('schedule-grid');
const employeeFilter = document.getElementById('employee-filter');
const shiftFilter = document.getElementById('shift-filter');
const dateFilter = document.getElementById('date-filter');

// Load data from Google Apps Script
async function loadData() {
    try {
        gridContainer.innerHTML = '<p style="text-align: center;">Đang tải dữ liệu...</p>';
        
        const today = new Date();
        const startDate = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000));
        const endDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        const response = await fetch(SCRIPT_URL, {
            redirect: "follow",
            method: "POST",
            body: JSON.stringify({ 
                startDate: startDate.toISOString(), 
                endDate: endDate.toISOString() 
            }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
            throw new Error('Data is not in expected format');
        }

        allData = data;
        filteredData = [...allData];
        populateFilters();
        renderGrid();
    } catch (error) {
        console.error('Error loading data:', error);
        gridContainer.innerHTML = `
            <p style="color: red; text-align: center;">
                Không thể tải dữ liệu lịch làm việc. ${error.message}<br>
                <button onclick="loadData()" style="margin-top: 10px;">Thử lại</button>
            </p>`;
    }
}

// Populate filter dropdowns
function populateFilters() {
    // Get unique employees
    const employees = [...new Set(allData.map(item => item["Tên nhân viên"]))].sort();
    
    // Clear existing options except "all"
    employeeFilter.innerHTML = '<option value="all">Tất cả nhân viên</option>';
    shiftFilter.innerHTML = '<option value="all">Tất cả ca</option>';
    
    // Add employee options
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee;
        option.textContent = employee;
        employeeFilter.appendChild(option);
    });
    
    // Get unique shifts
    const shifts = [...new Set(allData.map(item => item["Ca đăng ký"]))].sort();
    
    // Add shift options
    shifts.forEach(shift => {
        const option = document.createElement('option');
        option.value = shift;
        option.textContent = shift;
        shiftFilter.appendChild(option);
    });
}

// Filter data based on selected filters
function filterData() {
    const selectedEmployee = employeeFilter.value;
    const selectedShift = shiftFilter.value;
    const selectedDate = dateFilter.value;

    filteredData = allData.filter(item => {
        const employeeMatch = selectedEmployee === 'all' || item["Tên nhân viên"] === selectedEmployee;
        const shiftMatch = selectedShift === 'all' || item["Ca đăng ký"] === selectedShift;
        const dateMatch = selectedDate === 'all' || item["Ngày đi làm"] === selectedDate;
        return employeeMatch && shiftMatch && dateMatch;
    });
    
    renderGrid();
}

// Render the schedule grid
function renderGrid() {
    if (filteredData.length === 0) {
        gridContainer.innerHTML = '<p style="text-align: center; color: #666;">Không có dữ liệu lịch làm việc.</p>';
        return;
    }
    
    // Get unique dates and employees
    const dates = [...new Set(filteredData.map(item => item["Ngày đi làm"]))].sort();
    const employees = [...new Set(filteredData.map(item => item["Tên nhân viên"]))].sort();
    
    // Create grid structure
    const gridColumns = dates.length + 1; // +1 for employee column
    gridContainer.style.gridTemplateColumns = `200px repeat(${dates.length}, 120px)`;
    
    // Clear existing content
    gridContainer.innerHTML = '';
    
    // Create header row
    const headerCell = document.createElement('div');
    headerCell.className = 'grid-cell header-cell';
    headerCell.textContent = 'Nhân viên';
    gridContainer.appendChild(headerCell);
    
    // Add date headers
    dates.forEach(date => {
        const dateCell = document.createElement('div');
        dateCell.className = 'grid-cell header-cell';
        dateCell.textContent = formatDateWithWeekday(date);
        gridContainer.appendChild(dateCell);
    });
    
    // Create employee rows
    employees.forEach(employee => {
        // Employee name cell
        const employeeCell = document.createElement('div');
        employeeCell.className = 'grid-cell header-cell';
        employeeCell.textContent = employee;
        gridContainer.appendChild(employeeCell);
        
        // Schedule cells for each date
        dates.forEach(date => {
            const scheduleCell = document.createElement('div');
            scheduleCell.className = 'grid-cell';
            
            // Find all schedules for this employee and date
            const schedules = filteredData.filter(item => 
                item["Tên nhân viên"] === employee && item["Ngày đi làm"] === date
            );
            
            if (schedules.length > 0) {
                // Format each schedule as "Shift name : Vị trí công việc"
                const formattedSchedules = schedules.map(schedule => {
                    const shift = schedule["Ca đăng ký"] || '';
                    const position = schedule["Vị Trí Công Việc"] || '';
                    
                    if (shift && position) {
                        return `${shift} : ${position}`;
                    }
                    return '';
                }).filter(item => item !== ''); // Remove empty entries
                
                if (formattedSchedules.length > 0) {
                    scheduleCell.innerHTML = formattedSchedules.join('<br><br>');
                    
                    // Apply styling based on shifts
                    const shifts = schedules.map(s => s["Ca đăng ký"].toLowerCase());
                    
                    // Check for mixed shifts
                    if (shifts.length > 1) {
                        scheduleCell.className += ' shift-mixed';
                    } else {
                        // Single shift styling
                        const shiftLower = shifts[0];
                        if (shiftLower.includes('sáng') || shiftLower.includes('sang')) {
                            scheduleCell.className += ' shift-sang';
                        } else if (shiftLower.includes('chiều') || shiftLower.includes('chieu')) {
                            scheduleCell.className += ' shift-chieu';
                        } else if (shiftLower.includes('tối') || shiftLower.includes('toi')) {
                            scheduleCell.className += ' shift-toi';
                        }
                    }
                } else {
                    scheduleCell.textContent = '-';
                }
            } else {
                scheduleCell.textContent = '-';
            }
            
            gridContainer.appendChild(scheduleCell);
        });
    });
    
    // Populate date filter
    dateFilter.innerHTML = '<option value="all">Tất cả ngày</option>';
    dates.forEach(date => {
        const option = document.createElement('option');
        option.value = date;
        option.textContent = formatDateWithWeekday(date);
        dateFilter.appendChild(option);
    });
}

// Format date for display
function formatDate(dateString) {
    try {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

// Format date with Vietnamese weekday
function formatDateWithWeekday(dateString) {
    try {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const dayMonth = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
        });
        
        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const weekday = weekdays[date.getDay()];
        
        return `${weekday}\n${dayMonth}`;
    } catch (error) {
        console.error('Error formatting date with weekday:', error);
        return dateString;
    }
}

// Event listeners
employeeFilter.addEventListener('change', filterData);
shiftFilter.addEventListener('change', filterData);
dateFilter.addEventListener('change', filterData);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra các elements cần thiết
    if (!gridContainer || !employeeFilter || !shiftFilter || !dateFilter) {
        console.error('Required DOM elements not found');
        return;
    }
    loadData();
});
