// DÁN URL BẠN VỪA COPY TỪ APPS SCRIPT VÀO ĐÂY
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxRyVxBVrgn27vQQTVtOswR7AttTzIIxEBa1VY10qh3kCLA0cKldjL2rkqe-cAPwnlhYQ/exec'; 

// Global variables
let allData = [];
let filteredData = [];

// DOM elements
const gridContainer = document.getElementById('schedule-grid');
// Get unique employees with schedules on the current date
const today = new Date();
const currentDate = formatDate(today.toISOString());
const employees = [...new Set(allData.filter(item => item["Ngày đi làm"] === currentDate).map(item => item["Tên nhân viên"]))].sort();
const shiftFilter = document.getElementById('shift-filter');
const dateFilter = document.getElementById('date-filter');

// Load data from Google Apps Script
async function loadData() {
    try {
        const today = new Date();
        const startDate = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)); // TODAY-3
        const endDate = new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000)); // TODAY+3
        
        const response = await fetch(SCRIPT_URL, {
            redirect: "follow",
            method: "POST",
            body: JSON.stringify({ startDate: startDate.toISOString(), endDate: endDate.toISOString() }),
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
        });
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        allData = await response.json();

        // Dữ liệu đã ở định dạng JSON, không cần parse CSV nữa
        filteredData = [...allData];
        populateFilters();
        renderGrid();
    } catch (error) {
        console.error('There has been a problem with your fetch operation:', error);
        // Hiển thị lỗi cho người dùng nếu không tải được dữ liệu
        gridContainer.innerHTML = '<p style="color: red; text-align: center;">Không thể tải dữ liệu lịch làm việc. Vui lòng thử lại sau.</p>';
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

filteredData = allData.filter(item => {
    const employeeMatch = selectedEmployee === 'all' || item["Tên nhân viên"] === selectedEmployee;
    const shiftMatch = selectedShift === 'all' || item["Ca đăng ký"] === selectedShift;
    return employeeMatch && shiftMatch;
};  
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
                    
                    // Apply styling based on the first shift
                    const firstShift = schedules[0]["Ca đăng ký"];
                    if (firstShift) {
                        // Map shift names to CSS classes
                        let shiftClass = '';
                        const shiftLower = firstShift.toLowerCase();
                        if (shiftLower.includes('sáng') || shiftLower.includes('sang')) {
                            shiftClass = 'shift-sang';
                        } else if (shiftLower.includes('chiều') || shiftLower.includes('chieu')) {
                            shiftClass = 'shift-chieu';
                        } else if (shiftLower.includes('tối') || shiftLower.includes('toi')) {
                            shiftClass = 'shift-toi';
                        }
                        
                        if (shiftClass) {
                            scheduleCell.className += ` ${shiftClass}`;
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
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
        });
    } catch (error) {
        return dateString;
    }
}

// Format date with Vietnamese weekday
function formatDateWithWeekday(dateString) {
    try {
        const date = new Date(dateString);
        const dayMonth = date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit'
        });
        
        const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        const weekday = weekdays[date.getDay()];
        
        return `${dayMonth}\n${weekday}`;
    } catch (error) {
        return dateString;
    }
}

// Event listeners
employeeFilter.addEventListener('change', filterData);
shiftFilter.addEventListener('change', filterData);
dateFilter.addEventListener('change', filterData);

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
});
