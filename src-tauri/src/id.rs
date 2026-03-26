const ALPHABET: [char; 36] = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
];

const ID_LENGTH: usize = 6;

pub fn generate_id() -> String {
    nanoid::nanoid!(ID_LENGTH, &ALPHABET)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn id_has_correct_length() {
        let id = generate_id();
        assert_eq!(id.len(), ID_LENGTH);
    }

    #[test]
    fn id_contains_only_allowed_chars() {
        for _ in 0..100 {
            let id = generate_id();
            for ch in id.chars() {
                assert!(
                    ch.is_ascii_uppercase() || ch.is_ascii_digit(),
                    "unexpected char: {ch}"
                );
            }
        }
    }

    #[test]
    fn ids_are_unique() {
        let ids: Vec<String> = (0..1000).map(|_| generate_id()).collect();
        let unique: std::collections::HashSet<&String> = ids.iter().collect();
        assert_eq!(ids.len(), unique.len(), "collision detected in 1000 IDs");
    }
}
