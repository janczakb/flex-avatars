<?php

declare(strict_types=1);

require __DIR__.'/../src/Catalog.php';

use UseFlex\Avatars\Catalog;

function check(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}

$catalog = new Catalog();
$counts = array_column($catalog->collections(), 'count', 'id');
check($counts === ['animals' => 31, 'art' => 20, 'egypt' => 13, 'greek' => 20, 'slavic' => 12], 'Unexpected collection counts.');
foreach ($counts as $category => $count) {
    $rows = $catalog->avatars($category);
    check(count($rows) === $count && count(array_unique(array_column($rows, 'id'))) === $count, "Invalid collection $category.");
    foreach ($rows as $row) {
        check($catalog->find($row['id']) === $row, 'Lookup failed.');
        $name = explode('/', $row['id'])[1].'.avif';
        foreach (['image' => ['900px', 900], 'preview' => ['preview-300px', 300]] as $key => [$directory, $size]) {
            check($row[$key] === "$category/$directory/$name", 'The original asset path was changed.');
            $image = getimagesize(Catalog::assetsPath().'/'.$row[$key]);
            check($image !== false && $image['mime'] === 'image/avif' && max($image[0], $image[1]) <= $size, 'Invalid AVIF.');
        }
    }
}
check($catalog->find('../catalog.json') === null, 'Unsafe ID accepted.');
check($catalog->avatars('invalid') === [], 'Unknown collection accepted.');
check($catalog->pick('42', 'invalid') === null, 'Unknown collection matched a default avatar.');
foreach (['user-42', 'Łukasz-🏝', '', 'another-id'] as $seed) {
    $picked = $catalog->pick($seed, 'animals');
    check($picked !== null && $picked['collection'] === 'animals' && $catalog->pick($seed, 'animals') === $picked, 'Assignment is unstable.');
}
echo "Verified 96 avatar IDs and all 192 AVIF files.\n";
