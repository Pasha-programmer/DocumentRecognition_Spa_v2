import { format, formatISO, setHours, setMilliseconds, setMinutes, setSeconds } from "date-fns";

export class DateOnly extends Date{ 

    constructor(date?: Date){
        date ??= new Date();
        date = setHours(date, 0)
        date = setMinutes(date, 0)
        date = setSeconds(date, 0)
        date = setMilliseconds(date, 0)
        super(date)
    }

    readonly isDateOnly: boolean = true;

    toJSON(): string {
        return format(this, 'yyyy-MM-dd');
    };
}

export class DateTimeOffset extends Date{ 

    constructor(date?: Date){
        super(date ?? new Date())
    }

    readonly isDateTimeOffset: boolean = true;

    toJSON(): string {
        return formatISO(this);
    };
} 

export class TimeOnly extends Date{ 

    constructor(date?: Date){
        super(date ?? new Date())
    }

    readonly isTimeOnly: boolean = true;

    toJSON(): string {
        return format(this, 'HH:mm:ss.SSS');
    };
} 

Date.prototype.toJSON = function() {
    return format(this, 'yyyy-MM-dd HH:mm:ss.SS')
};