create or replace function precheck_info()
returns trigger
language plpgsql
as $$
begin 
    if (TG_OP = 'INSERT') then 
        if(new.name is null or new.email is null or new.password_hash is null or new.phone_number is null) then 
            -- if (length(new.password) < 8) then 
            --     raise exception 'Password must be at least 8 characters long';
            -- end if;
            --hash store hbe so eta unncessary
            raise exception 'Name, email, password and phone number cannot be null';
        end if;
        if new.email !~ '^[A-Za-z0-9._%+-]+@gmail\.com$' then
        raise exception 'Email must be a valid Gmail address';
        end if;
        if new.phone_number !~ '^\+8801[3-9][0-9]{8}$' and new.phone_number!~'^01[3-9][0-9]{8}$' then
        raise exception 'Phone number must be a valid Bangladeshi number starting with +880';
        end if;
        if new.name !~ '^[A-Za-z ]+$' then
        raise exception 'Name must contain only letters and spaces';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists precheck_info_trigger on users;

create trigger precheck_info_trigger
before insert on users
for each row
execute function precheck_info();