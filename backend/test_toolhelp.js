const koffi = require('koffi');
const kernel32 = koffi.load('kernel32.dll');

const TH32CS_SNAPPROCESS = 0x00000002;
const PROCESSENTRY32 = koffi.struct('PROCESSENTRY32', {
    dwSize: 'uint32_t',
    cntUsage: 'uint32_t',
    th32ProcessID: 'uint32_t',
    th32DefaultHeapID: 'uint64_t', // ULONG_PTR can be 64-bit on x64
    th32ModuleID: 'uint32_t',
    cntThreads: 'uint32_t',
    th32ParentProcessID: 'uint32_t',
    pcPriClassBase: 'int32_t',
    dwFlags: 'uint32_t',
    szExeFile: koffi.array('char', 260)
});

const HANDLE = koffi.pointer('HANDLE', koffi.opaque());
const CreateToolhelp32Snapshot = kernel32.func('HANDLE __stdcall CreateToolhelp32Snapshot(uint32_t dwFlags, uint32_t th32ProcessID)');
const Process32First = kernel32.func('bool __stdcall Process32First(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)');
const Process32Next = kernel32.func('bool __stdcall Process32Next(HANDLE hSnapshot, _Inout_ PROCESSENTRY32 *lppe)');
const CloseHandle = kernel32.func('bool __stdcall CloseHandle(HANDLE hObject)');

const snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
if (!snapshot) {
    console.error('Failed to create snapshot');
    process.exit(1);
}

const pe32 = { dwSize: koffi.sizeof(PROCESSENTRY32) };
console.log('Sizeof PROCESSENTRY32:', pe32.dwSize);

const processes = [];
let hasNext = Process32First(snapshot, pe32);
while (hasNext) {
    let name = '';
    if (pe32.szExeFile) {
        name = Buffer.from(pe32.szExeFile).toString('utf8').replace(/\0/g, '');
    }
    processes.push({
        pid: pe32.th32ProcessID,
        ppid: pe32.th32ParentProcessID,
        name
    });
    hasNext = Process32Next(snapshot, pe32);
}
CloseHandle(snapshot);

console.log('Total processes:', processes.length);
console.log('First 5 processes:', processes.slice(0, 5));
