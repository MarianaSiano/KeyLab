export interface Professor {
    id: number;
    name: string;
    email: string | null;
}

export interface Student {
    id: number;
    name: string;
    email: string;
    registration_number: string;
    type: 'Graduação' | 'Pós-Graduação';
    professor_id: number;
    professor_name: string;
    professor_email: string | null;
    created_at: string;
}

export interface Key {
    id: number;
    name: string;
    status: 'disponivel' | 'emprestada';
    current_student_id: number | null;
    last_borrowed_at: string | null;
    student_name: string | null;
    student_email: string | null;
    student_registration: string | null;
    professor_name: string | null;
}

export interface KeyLog {
    id: number;
    key_id: number;
    key_name: string;
    student_id: number | null;
    student_name: string | null;
    student_name_snapshot: string;
    student_registration: string | null;
    student_type: 'Graduação' | 'Pós-Graduação' | null;
    professor_name: string | null;
    taken_at: string;
    returned_at: string | null;
}